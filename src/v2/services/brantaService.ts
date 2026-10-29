import type { BrantaCryptoProvider } from '../../index.js';
import { WEB_CRYPTO_UNAVAILABLE_MESSAGE } from '../../classes/aesEncryption.js';
import { AesEncryptionService } from '../../classes/aesEncryptionService.js';
import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { DestinationType } from '../../enums/destinationType.js';
import { BrantaPaymentException, BrantaPaymentExceptionReason } from '../../exceptions/brantaPaymentException.js';
import {
  getBaseUrl,
  getDerivedKeyType,
  toNormalizedHash,
  toUrlFragment,
} from '../../extensions/brantaExtensions.js';
import { GuidSecretGenerator } from '../classes/guidSecretGenerator.js';
import { PaymentBuilder } from '../classes/paymentBuilder.js';
import { detectDestinationType, QRParser } from '../classes/qrParser.js';
import { IAesEncryption } from '../interfaces/iAesEncryption.js';
import { IBrantaClient } from '../interfaces/iBrantaClient.js';
import { IBrantaService } from '../interfaces/iBrantaService.js';
import { ISecretGenerator } from '../interfaces/iSecretGenerator.js';
import { Destination } from '../models/destination.js';
import { Payment } from '../models/payment.js';
import { PaymentsResult } from '../models/paymentsResult.js';
import { BrantaClient } from './brantaClient.js';

const TAMPERED_MESSAGE =
  'The Bitcoin address does not match the address verified by Branta. The destination may have been tampered with.';

const addressesMatch = (a: string, b: string): boolean => {
  const isBech32 = (v: string): boolean => /^(bc|tb|bcrt)1/i.test(v);
  if (isBech32(a) && isBech32(b)) return a.toLowerCase() === b.toLowerCase();
  return a === b;
};

const uniformOnChainAddress = (parser: QRParser): string | undefined => {
  const addresses = parser.destinations
    .filter((d) => d.type === DestinationType.BitcoinAddress && d.value.trim() !== '')
    .map((d) => d.value);
  if (addresses.length === 0) return undefined;
  const first = addresses[0]!;
  for (const address of addresses.slice(1)) {
    if (!addressesMatch(first, address)) {
      throw new BrantaPaymentException(TAMPERED_MESSAGE, BrantaPaymentExceptionReason.Tampered);
    }
  }
  return first;
};

export interface BrantaServiceOptions {
  defaultOptions?: BrantaClientOptions;
  client?: IBrantaClient;
  aesEncryption?: IAesEncryption;
  secretGenerator?: ISecretGenerator;
  fetchImpl?: typeof fetch;
  crypto?: BrantaCryptoProvider;
}

export class BrantaService implements IBrantaService {
  private readonly defaultOptions?: BrantaClientOptions;
  private readonly client: IBrantaClient;
  private readonly aesEncryption: IAesEncryption;
  private readonly secretGenerator: ISecretGenerator;
  private readonly crypto?: BrantaCryptoProvider;

  constructor(defaultOptions?: BrantaClientOptions, opts: BrantaServiceOptions = {}) {
    const merged: BrantaServiceOptions = { ...opts };
    if (defaultOptions !== undefined && merged.defaultOptions === undefined) {
      merged.defaultOptions = defaultOptions;
    }
    if (merged.defaultOptions !== undefined) this.defaultOptions = merged.defaultOptions;
    this.crypto = merged.crypto;
    this.client = merged.client ?? new BrantaClient(this.defaultOptions, merged.fetchImpl, this.crypto);
    this.aesEncryption = merged.aesEncryption ?? new AesEncryptionService(this.crypto);
    this.secretGenerator = merged.secretGenerator ?? new GuidSecretGenerator(this.crypto);
  }

  createPaymentBuilder(): PaymentBuilder {
    return new PaymentBuilder(this.crypto);
  }

  async verify(input: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<PaymentsResult> {
    const parser = new QRParser(input);
    const expectedOnChainAddress = uniformOnChainAddress(parser);

    if (parser.hasUnverifiableInstruction) {
      const lookup = parser.onChainEncryptionText ?? parser.destination ?? '';
      return { payments: [], verifyUrl: this.buildVerifyUrl(options, lookup) };
    }

    if (parser.hasBrantaParams()) {
      const additionalValues = parser.destinations
        .filter((d) => getDerivedKeyType(d.value) !== undefined)
        .map((d) => d.value);
      return this.lookupByBrantaId(
        parser.onChainEncryptionText!,
        parser.onChainEncryptionSecret,
        additionalValues,
        expectedOnChainAddress,
        options,
        signal,
      );
    }

    const destination = parser.destination!;
    if (getDerivedKeyType(destination) === undefined) {
      return { payments: [], verifyUrl: this.buildVerifyUrl(options, destination) };
    }

    return this.lookupByDerivedKey(destination, options, signal);
  }

  private async lookupByBrantaId(
    lookupValue: string,
    encryptionKey: string | undefined,
    additionalHashValues: string[],
    expectedOnChainAddress: string | undefined,
    options: BrantaClientOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<PaymentsResult> {
    const payments = await this.client.getPayments(lookupValue, options, signal);

    const keys: Record<string, string> = {};
    const bound: Payment[] = [];
    for (const payment of payments) {
      const onChainBound = await this.decryptDestinations(
        payment,
        lookupValue,
        encryptionKey,
        undefined,
        keys,
        expectedOnChainAddress,
      );
      let hashesBound = true;
      for (const value of additionalHashValues) {
        if (!(await this.decryptDerivedKeyDestinations(payment, value, keys))) hashesBound = false;
      }
      if (onChainBound && hashesBound) bound.push(payment);
    }

    return { payments: bound, verifyUrl: this.buildVerifyUrl(options, lookupValue, keys) };
  }

  private async decryptDerivedKeyDestinations(
    payment: Payment,
    plainValue: string,
    keys: Record<string, string>,
  ): Promise<boolean> {
    const derivedType = getDerivedKeyType(plainValue);
    if (derivedType === undefined) return false;

    const key = await toNormalizedHash(plainValue, this.crypto);
    let bound = false;
    for (const destination of payment.destinations) {
      if (destination.isEncrypted === false || destination.type !== derivedType) continue;
      try {
        destination.value = await this.aesEncryption.decrypt(destination.value, key);
        destination.isEncrypted = false;
        if (destination.zkId !== undefined && !(destination.zkId in keys)) {
          keys[destination.zkId] = key;
        }
        await this.tryDecryptMetadata(payment, destination, key);
        bound = true;
      } catch (err) {
        if (err instanceof Error && err.message.includes(WEB_CRYPTO_UNAVAILABLE_MESSAGE)) {
          throw new BrantaPaymentException(
            'Unable to verify this payment: encryption is not available in this environment.',
            BrantaPaymentExceptionReason.CryptoUnavailable,
          );
        }
        // Key didn't match this destination — leave it encrypted.
      }
    }
    return bound;
  }

  private async lookupByDerivedKey(
    destinationValue: string,
    options?: BrantaClientOptions,
    signal?: AbortSignal,
  ): Promise<PaymentsResult> {
    const derivedType = getDerivedKeyType(destinationValue)!;
    const normalizedDestination = destinationValue.toLowerCase();
    const lookupValue = await this.aesEncryption.encrypt(
      normalizedDestination,
      await toNormalizedHash(normalizedDestination, this.crypto),
      true,
    );

    const payments = await this.client.getPayments(lookupValue, options, signal);

    const keys: Record<string, string> = {};
    for (const payment of payments) {
      await this.decryptDestinations(payment, normalizedDestination, undefined, derivedType, keys);
    }

    return { payments, verifyUrl: this.buildVerifyUrl(options, lookupValue, keys) };
  }

  private async decryptDestinations(
    payment: Payment,
    destinationValue: string,
    encryptionKey: string | undefined,
    derivedType: DestinationType | undefined,
    keys: Record<string, string>,
    expectedOnChainAddress?: string,
  ): Promise<boolean> {
    let onChainBound = expectedOnChainAddress === undefined;
    for (const destination of payment.destinations) {
      if (destination.isEncrypted === false) continue;
      destination.isEncrypted = true;

      if (destination.type === DestinationType.BitcoinAddress) {
        if (encryptionKey === undefined) continue;
        let decrypted: string;
        try {
          decrypted = await this.aesEncryption.decrypt(destination.value, encryptionKey);
        } catch (err) {
          if (err instanceof Error && err.message.includes(WEB_CRYPTO_UNAVAILABLE_MESSAGE)) {
            throw new BrantaPaymentException(
              'Unable to verify this payment: encryption is not available in this environment.',
              BrantaPaymentExceptionReason.CryptoUnavailable,
            );
          }
          // Key didn't match this destination — leave it encrypted.
          continue;
        }
        if (expectedOnChainAddress !== undefined && !addressesMatch(decrypted, expectedOnChainAddress)) {
          throw new BrantaPaymentException(TAMPERED_MESSAGE, BrantaPaymentExceptionReason.Tampered);
        }
        if (expectedOnChainAddress !== undefined) onChainBound = true;
        destination.value = decrypted;
        destination.isEncrypted = false;
        if (destination.zkId !== undefined && !(destination.zkId in keys)) {
          keys[destination.zkId] = encryptionKey;
        }
        await this.tryDecryptMetadata(payment, destination, encryptionKey);
      } else if (derivedType !== undefined && destination.type === derivedType) {
        const key = await toNormalizedHash(destinationValue, this.crypto);
        try {
          destination.value = await this.aesEncryption.decrypt(destination.value, key);
          destination.isEncrypted = false;
          if (destination.zkId !== undefined && !(destination.zkId in keys)) {
            keys[destination.zkId] = key;
          }
          await this.tryDecryptMetadata(payment, destination, key);
        } catch {
          // Key didn't match this destination — leave it encrypted.
        }
      }
    }
    return onChainBound;
  }

  private async tryDecryptMetadata(payment: Payment, destination: Destination, keyUsed: string): Promise<void> {
    if (destination.encryptedDek === undefined || payment.metadata == null || payment.isMetadataDecrypted) return;
    try {
      const dek = await this.aesEncryption.decrypt(destination.encryptedDek, keyUsed);
      payment.metadata = await this.aesEncryption.decrypt(payment.metadata, dek);
      payment.isMetadataDecrypted = true;
    } catch {
      // DEK decryption failed — leave metadata as-is.
    }
  }

  async addPayment(
    payment: Payment,
    options?: BrantaClientOptions,
    signal?: AbortSignal,
  ): Promise<{ payment: Payment; secret: string; verifyUrl: string }> {
    let dek: string | undefined;
    if (payment.metadata != null && payment.destinations.length > 0) {
      dek = this.secretGenerator.generate();
      payment.metadata = await this.aesEncryption.encrypt(payment.metadata, dek, false);
    }

    const secret = this.secretGenerator.generate();
    const encryptedToKey: Record<string, string> = {};

    for (const destination of payment.destinations) {
      if (destination.zkId === undefined) {
        destination.zkId = (this.crypto ?? globalThis.crypto).randomUUID();
      }

      const type = destination.type ?? detectDestinationType(destination.value);
      if (destination.type === undefined && type !== undefined) destination.type = type;

      if (type === DestinationType.BitcoinAddress) {
        destination.value = await this.aesEncryption.encrypt(destination.value, secret, this.secretGenerator.deterministicNonce);
        encryptedToKey[destination.value] = secret;
        if (dek !== undefined) {
          destination.encryptedDek = await this.aesEncryption.encrypt(dek, secret, false);
        }
      } else {
        const derivedType = getDerivedKeyType(destination.value);
        if (derivedType === undefined) {
          throw new BrantaPaymentException(`destination type '${destination.type}' cannot be encrypted`);
        }
        const normalizedValue = destination.value.toLowerCase();
        const key = await toNormalizedHash(normalizedValue, this.crypto);
        destination.value = await this.aesEncryption.encrypt(normalizedValue, key, true);
        encryptedToKey[destination.value] = key;
        if (dek !== undefined) {
          destination.encryptedDek = await this.aesEncryption.encrypt(dek, key, false);
        }
      }
    }

    const responsePayment = await this.client.postPayment(payment, options, signal);
    if (!responsePayment) {
      throw new BrantaPaymentException('No payment returned from server.');
    }

    const keys: Record<string, string> = {};
    for (const d of responsePayment.destinations) {
      if (d.zkId !== undefined && d.value in encryptedToKey) {
        keys[d.zkId] = encryptedToKey[d.value]!;
      }
    }

    const primaryValue = payment.destinations[0]?.value ?? '';
    const verifyUrl = this.buildVerifyUrl(options, primaryValue, keys);

    return { payment: responsePayment, secret, verifyUrl };
  }

  isApiKeyValid(options?: BrantaClientOptions, signal?: AbortSignal): Promise<boolean> {
    return this.client.isApiKeyValid(options, signal);
  }

  private buildVerifyUrl(options: BrantaClientOptions | undefined, paymentLookup: string, keys?: Record<string, string>): string {
    const baseUrl = getBaseUrl(this.defaultOptions, options);
    let url = `${baseUrl}/v2/verify/${encodeURIComponent(paymentLookup)}`;
    if (keys && Object.keys(keys).length > 0) {
      url += toUrlFragment(keys);
    }
    return url;
  }
}
