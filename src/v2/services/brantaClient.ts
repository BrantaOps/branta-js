import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { BrantaPaymentException } from '../../exceptions/brantaPaymentException.js';
import { getApiKey, getBaseUrl, getHmacSecret } from '../../extensions/brantaExtensions.js';
import { IBrantaClient } from '../interfaces/iBrantaClient.js';
import { Payment } from '../models/payment.js';
import { paymentFromApi, paymentToApi } from './serialization.js';

type Bytes = Uint8Array<ArrayBuffer>;

const subtle = (): SubtleCrypto => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto API is not available. See README for React Native polyfill instructions.');
  }
  return c.subtle;
};

const utf8Bytes = (text: string): Bytes => new TextEncoder().encode(text);

const hmacSha256Hex = async (keyBytes: Bytes, messageBytes: Bytes): Promise<string> => {
  const key = await subtle().importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await subtle().sign('HMAC', key, messageBytes));
  let hex = '';
  for (let i = 0; i < signature.length; i++) hex += signature[i]!.toString(16).padStart(2, '0');
  return hex;
};

type FetchImpl = typeof fetch;

export class BrantaClient implements IBrantaClient {
  private readonly defaultOptions?: BrantaClientOptions;
  private readonly fetchImpl: FetchImpl;

  constructor(defaultOptions?: BrantaClientOptions, fetchImpl?: FetchImpl) {
    if (defaultOptions !== undefined) this.defaultOptions = defaultOptions;
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async getPayments(destinationValue: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<Payment[]> {
    const baseUrl = this.resolveBaseUrl(options);
    const headers = this.buildHeaders(options, false);

    const response = await this.fetchImpl(`${baseUrl}/v2/payments/${encodeURIComponent(destinationValue)}`, {
      method: 'GET',
      headers,
      ...(signal !== undefined ? { signal } : {}),
    });

    if (!response.ok) return [];

    const text = await response.text();
    if (text.length === 0) return [];

    const parsed = JSON.parse(text) as unknown;
    const rawList = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
    const payments = rawList.map(paymentFromApi);

    this.verifyLogoUrls(baseUrl, payments);

    return payments;
  }

  async postPayment(payment: Payment, options?: BrantaClientOptions, signal?: AbortSignal): Promise<Payment | undefined> {
    const baseUrl = this.resolveBaseUrl(options);
    const headers = this.buildHeaders(options, true);
    headers['Content-Type'] = 'application/json';

    const json = JSON.stringify(paymentToApi(payment));

    await this.applyHmacHeaders(headers, baseUrl, json, options);

    const response = await this.fetchImpl(`${baseUrl}/v2/payments`, {
      method: 'POST',
      headers,
      body: json,
      ...(signal !== undefined ? { signal } : {}),
    });

    if (!response.ok) {
      throw new BrantaPaymentException(this.statusText(response.status));
    }

    const text = await response.text();
    if (text.length === 0) return undefined;

    const parsed = JSON.parse(text) as Record<string, unknown>;
    return paymentFromApi(parsed);
  }

  async isApiKeyValid(options?: BrantaClientOptions, signal?: AbortSignal): Promise<boolean> {
    const baseUrl = this.resolveBaseUrl(options);
    const headers = this.buildHeaders(options, true);

    const response = await this.fetchImpl(`${baseUrl}/v2/api-keys/health-check`, {
      method: 'GET',
      headers,
      ...(signal !== undefined ? { signal } : {}),
    });

    return response.ok;
  }

  private resolveBaseUrl(options: BrantaClientOptions | undefined): string {
    return getBaseUrl(this.defaultOptions, options);
  }

  private buildHeaders(options: BrantaClientOptions | undefined, requireApiKey: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (requireApiKey) {
      const apiKey = getApiKey(this.defaultOptions, options);
      if (apiKey === undefined) throw new BrantaPaymentException('Unauthorized');
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
  }

  private async applyHmacHeaders(headers: Record<string, string>, baseUrl: string, json: string, options: BrantaClientOptions | undefined): Promise<void> {
    const hmacSecret = getHmacSecret(this.defaultOptions, options);
    if (hmacSecret === undefined) return;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const trimmedBase = baseUrl.replace(/\/+$/, '');
    const message = `POST|${trimmedBase}/v2/payments|${json}|${timestamp}`;
    const signature = await hmacSha256Hex(utf8Bytes(hmacSecret), utf8Bytes(message));

    headers['X-HMAC-Signature'] = signature;
    headers['X-HMAC-Timestamp'] = timestamp;
  }

  private verifyLogoUrls(baseUrl: string, payments: Payment[]): void {
    let baseOrigin: string;
    try {
      baseOrigin = new URL(baseUrl).origin;
    } catch {
      return;
    }

    for (const payment of payments) {
      const logoUrl = payment.platformLogoUrl;
      if (!logoUrl) return;

      let logoOrigin: string;
      try {
        logoOrigin = new URL(logoUrl).origin;
      } catch {
        throw new BrantaPaymentException('platformLogoUrl domain does not match the configured baseUrl domain');
      }
      if (logoOrigin !== baseOrigin) {
        throw new BrantaPaymentException('platformLogoUrl domain does not match the configured baseUrl domain');
      }
    }
  }

  private statusText(status: number): string {
    const map: Record<number, string> = {
      400: 'BadRequest',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'NotFound',
      409: 'Conflict',
      422: 'UnprocessableEntity',
      429: 'TooManyRequests',
      500: 'InternalServerError',
      502: 'BadGateway',
      503: 'ServiceUnavailable',
      504: 'GatewayTimeout',
    };
    return map[status] ?? String(status);
  }
}
