import type { BrantaCryptoProvider } from '../classes/brantaCryptoProvider.js';
import { BrantaApiOptions } from '../classes/brantaApiOptions.js';
import { BrantaEnvironment, BrantaEnvironmentUrls } from '../enums/brantaEnvironment.js';
import { DestinationType } from '../enums/destinationType.js';

type Bytes = Uint8Array<ArrayBuffer>;

const resolveSubtle = (crypto?: BrantaCryptoProvider): SubtleCrypto => {
  const c = crypto ?? (globalThis as { crypto?: Pick<Crypto, 'subtle'> }).crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto API is not available. Pass a crypto provider via BrantaServiceOptions or see README for setup instructions.');
  }
  return c.subtle;
};

export function getUrl(environment: BrantaEnvironment): string {
  const url = BrantaEnvironmentUrls[environment];
  if (!url) throw new Error(`No URL defined for ${environment}`);
  return url;
}

export function getUri(defaultOptions: BrantaApiOptions | undefined, overrideOptions: BrantaApiOptions | undefined): URL {
  return new URL(getBaseUrl(defaultOptions, overrideOptions));
}

export function getBaseUrl(defaultOptions: BrantaApiOptions | undefined, overrideOptions: BrantaApiOptions | undefined): string {
  const environment = overrideOptions?.environment ?? defaultOptions?.environment;
  if (!environment) throw new Error('Branta: environment is a required option.');
  return getUrl(environment);
}

export function getApiKey(defaultOptions: BrantaApiOptions | undefined, overrideOptions: BrantaApiOptions | undefined): string | undefined {
  return overrideOptions?.apiKey ?? defaultOptions?.apiKey;
}

export function getHmacSecret(defaultOptions: BrantaApiOptions | undefined, overrideOptions: BrantaApiOptions | undefined): string | undefined {
  return overrideOptions?.hmacSecret ?? defaultOptions?.hmacSecret;
}

export function isBolt11(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.startsWith('lnbc') || lower.startsWith('lntb') || lower.startsWith('lnbcrt');
}

export function isArk(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.startsWith('ark1') || lower.startsWith('tark1');
}

export function isSilentPayment(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.startsWith('sp1') || lower.startsWith('tsp1');
}

/** bolt11, Ark, and silent payments encrypt with a key derived from the value. */
export function getDerivedKeyType(value: string): DestinationType | undefined {
  if (isBolt11(value)) return DestinationType.Bolt11;
  if (isArk(value)) return DestinationType.ArkAddress;
  if (isSilentPayment(value)) return DestinationType.SilentPayment;
  return undefined;
}

export async function toNormalizedHash(value: string, crypto?: BrantaCryptoProvider): Promise<string> {
  const normalized = value.toLowerCase();
  const bytes = new TextEncoder().encode(normalized) as Bytes;
  const hash = new Uint8Array(await resolveSubtle(crypto).digest('SHA-256', bytes));
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
