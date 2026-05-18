import { AesEncryptionService } from '../../classes/aesEncryptionService.js';
import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { DestinationType } from '../../enums/destinationType.js';
import { PrivacyMode } from '../../enums/privacyMode.js';
import { BrantaPaymentException } from '../../exceptions/brantaPaymentException.js';
import {
  getBaseUrl,
  getHashZkType,
  getPrivacy,
  toNormalizedHash,
  toUrlFragment,
} from '../../extensions/brantaExtensions.js';
import { GuidSecretGenerator } from '../classes/guidSecretGenerator.js';
import { QRParser } from '../classes/qrParser.js';
import { IAesEncryption } from '../interfaces/iAesEncryption.js';
import { IBrantaClient } from '../interfaces/iBrantaClient.js';
import { IBrantaService } from '../interfaces/iBrantaService.js';
import { ISecretGenerator } from '../interfaces/iSecretGenerator.js';
import { Destination } from '../models/destination.js';
import { Payment } from '../models/payment.js';
import { PaymentsResult } from '../models/paymentsResult.js';
import { BrantaClient } from './brantaClient.js';

export interface BrantaServiceOptions {
  defaultOptions?: BrantaClientOptions;
  client?: IBrantaClient;
  aesEncryption?: IAesEncryption;
  secretGenerator?: ISecretGenerator;
  fetchImpl?: typeof fetch;
}

export class BrantaService implements IBrantaService {
  private readonly defaultOptions?: BrantaClientOptions;
  private readonly client: IBrantaClient;
  private readonly aesEncryption: IAesEncryption;
  private readonly secretGenerator: ISecretGenerator;

  constructor(defaultOptions?: BrantaClientOptions, opts: BrantaServiceOptions = {}) {
    const merged: BrantaServiceOptions = { ...opts };
    if (defaultOptions !== undefined && merged.defaultOptions === undefined) {
      merged.defaultOptions = defaultOptions;
    }
    if (merged.defaultOptions !== undefined) this.defaultOptions = merged.defaultOptions;
    this.client = merged.client ?? new BrantaClient(this.defaultOptions, merged.fetchImpl);
    this.aesEncryption = merged.aesEncryption ?? new AesEncryptionService();
    this.secretGenerator = merged.secretGenerator ?? new GuidSecretGenerator();
  }

  async getPaymentsByQrCode(qrText: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<PaymentsResult> {
    const parser = new QRParser(qrText);

    if (parser.isOnChainZk()) {
      const additionalValues = parser.destinations
        .filter((d) => getHashZkType(d.value) !== undefined)
        .map((d) => d.value);
      return this.getPaymentsForZk(parser.onChainEncryptionText!, parser.onChainEncryptionSecret, additionalValues, options, signal);
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
    options: BrantaClientOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<PaymentsResult> {
    const payments = await this.client.getPayments(lookupValue, options, signal);

    const keys: Record<string, string> = {};
    for (const payment of payments) {
      await this.decryptDestinations(payment.destinations, lookupValue, encryptionKey, undefined, keys);
      for (const value of additionalHashValues) {
        await this.decryptHashZkDestinations(payment.destinations, value, keys);
      }
    }

    return { payments, verifyUrl: this.buildVerifyUrl(options, lookupValue, keys) };
  }

  private async decryptHashZkDestinations(
    destinations: Destination[],
    plainValue: string,
    keys: Record<string, string>,
  ): Promise<void> {
    const hashZkType = getHashZkType(plainValue);
    if (hashZkType === undefined) return;

    const key = await toNormalizedHash(plainValue);
    for (const destination of destinations) {
      if (!destination.isZk || destination.type !== hashZkType) continue;
      try {
        destination.value = await this.aesEncryption.decrypt(destination.value, key);
        destination.isEncrypted = false;
        if (destination.zkId !== undefined && !(destination.zkId in keys)) {
          keys[destination.zkId] = key;
        }
      } catch {
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
      lookupValue = await this.aesEncryption.encrypt(normalizedDestination, await toNormalizedHash(normalizedDestination), true);
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
      await this.decryptDestinations(payment.destinations, normalizedDestination, destinationEncryptionKey, hashZkType, keys);
    }

    return { payments, verifyUrl: this.buildVerifyUrl(options, lookupValue, keys) };
  }

  private async decryptDestinations(
    destinations: Destination[],
    destinationValue: string,
    encryptionKey: string | undefined,
    hashZkType: DestinationType | undefined,
    keys: Record<string, string>,
  ): Promise<void> {
    for (const destination of destinations) {
      destination.isEncrypted = !!destination.isZk;
      if (!destination.isZk) continue;

      if (destination.type === DestinationType.BitcoinAddress) {
        if (encryptionKey === undefined) continue;
        try {
          destination.value = await this.aesEncryption.decrypt(destination.value, encryptionKey);
          destination.isEncrypted = false;
          if (destination.zkId !== undefined && !(destination.zkId in keys)) {
            keys[destination.zkId] = encryptionKey;
          }
        } catch {
          // Key didn't match this destination — leave it encrypted.
        }
      } else if (hashZkType !== undefined && destination.type === hashZkType) {
        const key = await toNormalizedHash(destinationValue);
        try {
          destination.value = await this.aesEncryption.decrypt(destination.value, key);
          destination.isEncrypted = false;
          if (destination.zkId !== undefined && !(destination.zkId in keys)) {
            keys[destination.zkId] = key;
          }
        } catch {
          // Key didn't match this destination — leave it encrypted.
        }
      }
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

    const secret = this.secretGenerator.generate();
    const encryptedToKey: Record<string, string> = {};

    for (const destination of payment.destinations) {
      if (!destination.isZk) continue;

      if (destination.type === DestinationType.BitcoinAddress) {
        destination.value = await this.aesEncryption.encrypt(destination.value, secret, this.secretGenerator.deterministicNonce);
        encryptedToKey[destination.value] = secret;
      } else {
        const hashZkType = getHashZkType(destination.value);
        if (hashZkType === undefined) {
          throw new BrantaPaymentException(`destination type '${destination.type}' does not support ZK`);
        }
        const normalizedValue = destination.value.toLowerCase();
        const key = await toNormalizedHash(normalizedValue);
        destination.value = await this.aesEncryption.encrypt(normalizedValue, key, true);
        encryptedToKey[destination.value] = key;
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
