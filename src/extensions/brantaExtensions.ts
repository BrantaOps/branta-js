import { BrantaClientOptions } from '../classes/brantaClientOptions.js';
import { sha256 } from '../classes/cryptoProvider.js';
import { BrantaServerBaseUrl, BrantaServerBaseUrls } from '../enums/brantaServerBaseUrl.js';
import { DestinationType } from '../enums/destinationType.js';
import { PrivacyMode } from '../enums/privacyMode.js';

type Bytes = Uint8Array<ArrayBuffer>;

export function getUrl(server: BrantaServerBaseUrl): string {
  const url = BrantaServerBaseUrls[server];
  if (!url) throw new Error(`No URL defined for ${server}`);
  return url;
}

export function getUri(defaultOptions: BrantaClientOptions | undefined, overrideOptions: BrantaClientOptions | undefined): URL {
  return new URL(getBaseUrl(defaultOptions, overrideOptions));
}

export function getBaseUrl(defaultOptions: BrantaClientOptions | undefined, overrideOptions: BrantaClientOptions | undefined): string {
  const baseUrl = overrideOptions?.baseUrl ?? defaultOptions?.baseUrl;
  if (!baseUrl) throw new Error('Branta: BaseUrl is a required option.');
  return getUrl(baseUrl);
}

export function getPrivacy(
  defaultOptions: BrantaClientOptions | undefined,
  overrideOptions: BrantaClientOptions | undefined,
  fallback: PrivacyMode = PrivacyMode.Strict,
): PrivacyMode {
  return overrideOptions?.privacy ?? defaultOptions?.privacy ?? fallback;
}

export function getApiKey(defaultOptions: BrantaClientOptions | undefined, overrideOptions: BrantaClientOptions | undefined): string | undefined {
  return overrideOptions?.defaultApiKey ?? defaultOptions?.defaultApiKey;
}

export function getHmacSecret(defaultOptions: BrantaClientOptions | undefined, overrideOptions: BrantaClientOptions | undefined): string | undefined {
  return overrideOptions?.hmacSecret ?? defaultOptions?.hmacSecret;
}

export function isBolt11(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.startsWith('lnbc') || lower.startsWith('lntb') || lower.startsWith('lnbcrt');
}

export function isArk(value: string): boolean {
  return value.toLowerCase().startsWith('ark1');
}

export function isSilentPayment(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.startsWith('sp1') || lower.startsWith('tsp1');
}

export function getHashZkType(value: string): DestinationType | undefined {
  if (isBolt11(value)) return DestinationType.Bolt11;
  if (isArk(value)) return DestinationType.ArkAddress;
  if (isSilentPayment(value)) return DestinationType.SilentPayment;
  return undefined;
}

export async function toNormalizedHash(value: string): Promise<string> {
  const normalized = value.toLowerCase();
  const bytes = new TextEncoder().encode(normalized) as Bytes;
  const hash = await sha256(bytes);
  let hex = '';
  for (let i = 0; i < hash.length; i++) {
    hex += hash[i]!.toString(16).padStart(2, '0').toUpperCase();
  }
  return hex;
}

export function toUrlFragment(keys: Record<string, string>): string {
  const entries = Object.entries(keys);
  if (entries.length === 0) return '';
  const fragments = entries.map(([k, v]) => `k-${k}=${v}`);
  return '#' + fragments.join('&');
}
