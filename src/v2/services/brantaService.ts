import type { BrantaCryptoProvider } from '../../classes/brantaCryptoProvider.js';
import { WEB_CRYPTO_UNAVAILABLE_MESSAGE } from '../../classes/aesEncryption.js';
import { AesEncryptionService } from '../../classes/aesEncryptionService.js';
import { BrantaApiOptions } from '../../classes/brantaApiOptions.js';
import { BrantaEnvironment } from '../../enums/brantaEnvironment.js';
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
import { VerifyResult, VerifyStatus } from '../models/verifyResult.js';
import { BrantaClient } from './brantaClient.js';

class TamperedError extends Error {
  constructor() {
    super();
    this.name = 'TamperedError';
  }
}

const toVerifyResult = (payments: Payment[], verifyUrl: string): VerifyResult =>
  payments.length === 0
    ? { status: VerifyStatus.Unknown, verifyUrl }
    : { status: VerifyStatus.Match, payments, verifyUrl };

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
      throw new TamperedError();
    }
  }
  return first;
};

export interface BrantaServiceOptions extends BrantaApiOptions {
  environment: BrantaEnvironment;
  crypto?: BrantaCryptoProvider;
  fetchImpl?: typeof fetch;
}

interface BrantaServiceDependencies {
  client?: IBrantaClient;
  aesEncryption?: IAesEncryption;
  secretGenerator?: ISecretGenerator;
}

export class BrantaService implements IBrantaService {
  private readonly defaultOptions: BrantaApiOptions;
  private readonly client: IBrantaClient;
  private readonly aesEncryption: IAesEncryption;
  private readonly secretGenerator: ISecretGenerator;
  private readonly crypto?: BrantaCryptoProvider;

  constructor(options: BrantaServiceOptions, deps: BrantaServiceDependencies = {}) {
    this.defaultOptions = options;
    this.crypto = options.crypto;
    this.client = deps.client ?? new BrantaClient(this.defaultOptions, options.fetchImpl, this.crypto);
    this.aesEncryption = deps.aesEncryption ?? new AesEncryptionService(this.crypto);
    this.secretGenerator = deps.secretGenerator ?? new GuidSecretGenerator(this.crypto);
  }

  createPaymentBuilder(): PaymentBuilder {
    return new PaymentBuilder(this.crypto);
  }

  async verify(input: string, options?: BrantaApiOptions, signal?: AbortSignal): Promise<VerifyResult> {
    const parser = new QRParser(input);
    const lookup = parser.onChainEncryptionText ?? parser.destination ?? '';

    try {
      const expectedOnChainAddress = uniformOnChainAddress(parser);

      if (parser.hasUnverifiableInstruction) {
        return { status: VerifyStatus.Unknown, verifyUrl: this.buildVerifyUrl(options, lookup) };
      }

      if (parser.hasBrantaParams()) {
        const additionalValues = parser.destinations
          .filter((d) => getDerivedKeyType(d.value) !== undefined)
          .map((d) => d.value);
        if (expectedOnChainAddress === undefined && additionalValues.length === 0) {
          return { status: VerifyStatus.Unknown, verifyUrl: this.buildVerifyUrl(options, lookup) };
        }
        const { payments, verifyUrl } = await this.lookupByBrantaId(
          parser.onChainEncryptionText!,
          parser.onChainEncryptionSecret,
          additionalValues,
          expectedOnChainAddress,
          options,
          signal,
        );
        return toVerifyResult(payments, verifyUrl);
      }

      const destination = parser.destination!;
      if (getDerivedKeyType(destination) === undefined) {
        return { status: VerifyStatus.Unknown, verifyUrl: this.buildVerifyUrl(options, destination) };
      }

      const { payments, verifyUrl } = await this.lookupByDerivedKey(destination, options, signal);
      return toVerifyResult(payments, verifyUrl);
    } catch (err) {
      if (err instanceof TamperedError) {
        return { status: VerifyStatus.Tampered, verifyUrl: this.buildVerifyUrl(options, lookup) };
      }
      throw err;
    }
  }

  private async lookupByBrantaId(
    lookupValue: string,
    encryptionKey: string | undefined,
    additionalHashValues: string[],
    expectedOnChainAddress: string | undefined,
    options: BrantaApiOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<{ payments: Payment[]; verifyUrl: string }> {
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
      const hasPayableInstruction = expectedOnChainAddress !== undefined || additionalHashValues.length > 0;
      if (hasPayableInstruction && onChainBound && hashesBound) bound.push(payment);
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
        if (destination.id !== undefined && !(destination.id in keys)) {
          keys[destination.id] = key;
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
    options?: BrantaApiOptions,
    signal?: AbortSignal,
  ): Promise<{ payments: Payment[]; verifyUrl: string }> {
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
          throw new TamperedError();
        }
        if (expectedOnChainAddress !== undefined) onChainBound = true;
        destination.value = decrypted;
        destination.isEncrypted = false;
        if (destination.id !== undefined && !(destination.id in keys)) {
          keys[destination.id] = encryptionKey;
        }
        await this.tryDecryptMetadata(payment, destination, encryptionKey);
      } else if (derivedType !== undefined && destination.type === derivedType) {
        const key = await toNormalizedHash(destinationValue, this.crypto);
        try {
          destination.value = await this.aesEncryption.decrypt(destination.value, key);
          destination.isEncrypted = false;
          if (destination.id !== undefined && !(destination.id in keys)) {
            keys[destination.id] = key;
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
    options?: BrantaApiOptions,
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
      if (destination.id === undefined) {
        destination.id = (this.crypto ?? globalThis.crypto).randomUUID();
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
      if (d.id !== undefined && d.value in encryptedToKey) {
        keys[d.id] = encryptedToKey[d.value]!;
      }
    }

    const primaryValue = payment.destinations[0]?.value ?? '';
    const verifyUrl = this.buildVerifyUrl(options, primaryValue, keys);

    return { payment: responsePayment, secret, verifyUrl };
  }

  isApiKeyValid(options?: BrantaApiOptions, signal?: AbortSignal): Promise<boolean> {
    return this.client.isApiKeyValid(options, signal);
  }

  private buildVerifyUrl(options: BrantaApiOptions | undefined, paymentLookup: string, keys?: Record<string, string>): string {
    const baseUrl = getBaseUrl(this.defaultOptions, options);
    let url = `${baseUrl}/v2/verify/${encodeURIComponent(paymentLookup)}`;
    if (keys && Object.keys(keys).length > 0) {
      url += toUrlFragment(keys);
    }
    return url;
  }
}
