import type { BrantaCryptoProvider } from '../../index.js';
import { WEB_CRYPTO_UNAVAILABLE_MESSAGE } from '../../classes/aesEncryption.js';
import { AesEncryptionService } from '../../classes/aesEncryptionService.js';
import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { DestinationType } from '../../enums/destinationType.js';
import { PrivacyMode } from '../../enums/privacyMode.js';
import { BrantaPaymentException, BrantaPaymentExceptionReason } from '../../exceptions/brantaPaymentException.js';
import {
  getBaseUrl,
  getHashZkType,
  getPrivacy,
  toNormalizedHash,
  toUrlFragment,
} from '../../extensions/brantaExtensions.js';
import { GuidSecretGenerator } from '../classes/guidSecretGenerator.js';
import { PaymentBuilder } from '../classes/paymentBuilder.js';
import { QRParser } from '../classes/qrParser.js';
import { IAesEncryption } from '../interfaces/iAesEncryption.js';
import { IBrantaClient } from '../interfaces/iBrantaClient.js';
import { IBrantaService } from '../interfaces/iBrantaService.js';
import { ISecretGenerator } from '../interfaces/iSecretGenerator.js';
import { Destination } from '../models/destination.js';
import { Payment } from '../models/payment.js';
import { PaymentsResult } from '../models/paymentsResult.js';
import { BrantaClient } from './brantaClient.js';

const addressesMatch = (a: string, b: string): boolean => {
  const isBech32 = (v: string): boolean => v.toLowerCase().startsWith('bc1');
  if (isBech32(a) && isBech32(b)) return a.toLowerCase() === b.toLowerCase();
  return a === b;
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

  async getPaymentsByQrCode(qrText: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<PaymentsResult> {
    const parser = new QRParser(qrText);

    if (parser.isOnChainZk()) {
      const additionalValues = parser.destinations
        .filter((d) => getHashZkType(d.value) !== undefined)
        .map((d) => d.value);
      const onChainAddress = parser.destinations.find((d) => d.type === DestinationType.BitcoinAddress)?.value;
      return this.getPaymentsForZk(
        parser.onChainEncryptionText!,
        parser.onChainEncryptionSecret,
        additionalValues,
        onChainAddress,
        options,
        signal,
      );
    }

    const destination = parser.destination!;
    if (getPrivacy(this.defaultOptions, options) === PrivacyMode.Strict && getHashZkType(destination) === undefined) {
      return { payments: [], verifyUrl: this.buildVerifyUrl(options, destination) };
    }

    return this.getPayments(destination, undefined, options, signal);
  }

  private async getPaymentsForZk(
    lookupValue: string,
    encryptionKey: string | undefined,
    additionalHashValues: string[],
    expectedOnChainAddress: string | undefined,
    options: BrantaClientOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<PaymentsResult> {
    const payments = await this.client.getPayments(lookupValue, options, signal);

    const keys: Record<string, string> = {};
    for (const payment of payments) {
      await this.decryptDestinations(payment, lookupValue, encryptionKey, undefined, keys, expectedOnChainAddress);
      for (const value of additionalHashValues) {
        await this.decryptHashZkDestinations(payment, value, keys);
      }
    }

    return { payments, verifyUrl: this.buildVerifyUrl(options, lookupValue, keys) };
  }

  private async decryptHashZkDestinations(
    payment: Payment,
    plainValue: string,
    keys: Record<string, string>,
  ): Promise<void> {
    const hashZkType = getHashZkType(plainValue);
    if (hashZkType === undefined) return;

    const key = await toNormalizedHash(plainValue, this.crypto);
    for (const destination of payment.destinations) {
      if (!destination.isZk || destination.type !== hashZkType) continue;
      try {
        destination.value = await this.aesEncryption.decrypt(destination.value, key);
        destination.isEncrypted = false;
        if (destination.zkId !== undefined && !(destination.zkId in keys)) {
          keys[destination.zkId] = key;
        }
        await this.tryDecryptMetadata(payment, destination, key);
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
  }

  async getPayments(
    destinationValue: string,
    destinationEncryptionKey?: string,
    options?: BrantaClientOptions,
    signal?: AbortSignal,
  ): Promise<PaymentsResult> {
    const hashZkType = getHashZkType(destinationValue);

    if (
      hashZkType === undefined &&
      destinationEncryptionKey === undefined &&
      getPrivacy(this.defaultOptions, options) === PrivacyMode.Strict
    ) {
      throw new BrantaPaymentException('PrivacyMode.Strict does not permit plain-text lookups for this destination type.');
    }

    const normalizedDestination = hashZkType !== undefined ? destinationValue.toLowerCase() : destinationValue;
    let lookupValue = normalizedDestination;
    if (hashZkType !== undefined) {
      lookupValue = await this.aesEncryption.encrypt(normalizedDestination, await toNormalizedHash(normalizedDestination, this.crypto), true);
    }

    let payments = await this.client.getPayments(lookupValue, options, signal);

    if (
      payments.length === 0 &&
      hashZkType !== undefined &&
      getPrivacy(this.defaultOptions, options) !== PrivacyMode.Strict
    ) {
      lookupValue = normalizedDestination;
      payments = await this.client.getPayments(lookupValue, options, signal);
    }

    const keys: Record<string, string> = {};
    for (const payment of payments) {
      await this.decryptDestinations(payment, normalizedDestination, destinationEncryptionKey, hashZkType, keys);
    }

    return { payments, verifyUrl: this.buildVerifyUrl(options, lookupValue, keys) };
  }

  private async decryptDestinations(
    payment: Payment,
    destinationValue: string,
    encryptionKey: string | undefined,
    hashZkType: DestinationType | undefined,
    keys: Record<string, string>,
    expectedOnChainAddress?: string,
  ): Promise<void> {
    for (const destination of payment.destinations) {
      destination.isEncrypted = !!destination.isZk;
      if (!destination.isZk) continue;

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
          console.log(
            `[branta] address mismatch — QR: ${expectedOnChainAddress}, verified: ${decrypted}`,
          );
          throw new BrantaPaymentException(
            'The Bitcoin address in the QR code does not match the address verified by Branta. The QR code may have been tampered with.',
            BrantaPaymentExceptionReason.Tampered,
          );
        }
        destination.value = decrypted;
        destination.isEncrypted = false;
        if (destination.zkId !== undefined && !(destination.zkId in keys)) {
          keys[destination.zkId] = encryptionKey;
        }
        await this.tryDecryptMetadata(payment, destination, encryptionKey);
      } else if (hashZkType !== undefined && destination.type === hashZkType) {
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
    if (
      getPrivacy(this.defaultOptions, options) === PrivacyMode.Strict &&
      payment.destinations.some((d) => !d.isZk)
    ) {
      throw new BrantaPaymentException(
        'PrivacyMode.Strict requires all destinations to be ZK; one or more destinations have isZk = false.',
      );
    }

    let dek: string | undefined;
    if (payment.metadata != null && payment.destinations.some((d) => d.isZk)) {
      dek = this.secretGenerator.generate();
      payment.metadata = await this.aesEncryption.encrypt(payment.metadata, dek, false);
    }

    const secret = this.secretGenerator.generate();
    const encryptedToKey: Record<string, string> = {};

    for (const destination of payment.destinations) {
      if (!destination.isZk) continue;

      if (destination.type === DestinationType.BitcoinAddress) {
        destination.value = await this.aesEncryption.encrypt(destination.value, secret, this.secretGenerator.deterministicNonce);
        encryptedToKey[destination.value] = secret;
        if (dek !== undefined) {
          destination.encryptedDek = await this.aesEncryption.encrypt(dek, secret, false);
        }
      } else {
        const hashZkType = getHashZkType(destination.value);
        if (hashZkType === undefined) {
          throw new BrantaPaymentException(`destination type '${destination.type}' does not support ZK`);
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
