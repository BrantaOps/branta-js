import { DestinationType } from '../../enums/destinationType.js';
import { isBolt11, isSilentPayment } from '../../extensions/brantaExtensions.js';

export interface QrDestination {
  value: string;
  type?: DestinationType;
}

const COLON_TO_QUESTION = /(?<=:)[^?]*/;
const LN_ADDRESS_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ETH_HEX_RE = /^[0-9a-fA-F]{40}$/;

const tryParseUrl = (text: string): URL | undefined => {
  try {
    return new URL(text);
  } catch {
    return undefined;
  }
};

const getDestination = (text: string): string | undefined => {
  const match = COLON_TO_QUESTION.exec(text);
  return match ? match[0] : undefined;
};

const startsWithI = (value: string, prefix: string): boolean => value.toLowerCase().startsWith(prefix.toLowerCase());

const isEthereumAddress = (value: string): boolean =>
  value.length === 42 && startsWithI(value, '0x') && ETH_HEX_RE.test(value.substring(2));

const isTronAddress = (value: string): boolean => value.length === 34 && value.startsWith('T');

const detectPlainTextType = (value: string): DestinationType | undefined => {
  if (isBolt11(value)) return DestinationType.Bolt11;
  if (startsWithI(value, 'lno')) return DestinationType.Bolt12;
  if (startsWithI(value, 'LNURL')) return DestinationType.LnUrl;
  if (startsWithI(value, 'ark1')) return DestinationType.ArkAddress;
  if (isSilentPayment(value)) return DestinationType.SilentPayment;
  if (isEthereumAddress(value)) return DestinationType.TetherAddress;
  if (isTronAddress(value)) return DestinationType.TetherAddress;
  if (LN_ADDRESS_RE.test(value)) return DestinationType.LnAddress;
  if (value.startsWith('1') || value.startsWith('3') || startsWithI(value, 'bc1')) return DestinationType.BitcoinAddress;
  return undefined;
};

const getDestinationType = (text: string): DestinationType | undefined => {
  if (startsWithI(text, 'bitcoin:')) return DestinationType.BitcoinAddress;
  if (startsWithI(text, 'lightning:')) {
    const dest = getDestination(text);
    if (dest && isBolt11(dest)) return DestinationType.Bolt11;
    if (dest && startsWithI(dest, 'lno')) return DestinationType.Bolt12;
    if (dest && startsWithI(dest, 'LNURL')) return DestinationType.LnUrl;
  }
  return undefined;
};

const parseQueryString = (query: string): Map<string, string> => {
  const result = new Map<string, string>();
  const trimmed = query.replace(/^\?/, '');
  if (!trimmed) return result;
  for (const part of trimmed.split('&')) {
    if (!part) continue;
    const idx = part.indexOf('=');
    const rawKey = idx === -1 ? part : part.substring(0, idx);
    const rawValue = idx === -1 ? '' : part.substring(idx + 1);
    if (!rawKey) continue;
    try {
      const key = decodeURIComponent(rawKey).toLowerCase();
      const value = decodeURIComponent(rawValue);
      if (!result.has(key)) result.set(key, value);
    } catch {
      // skip malformed parameter
    }
  }
  return result;
};

export class QRParser {
  readonly destinations: QrDestination[] = [];
  onChainEncryptionText?: string;
  onChainEncryptionSecret?: string;

  constructor(qrText: string) {
    const text = qrText.trim();

    const uri = tryParseUrl(text);
    if (!uri) {
      this.destinations.push({ value: text, type: detectPlainTextType(text) });
      return;
    }

    const scheme = uri.protocol.replace(/:$/, '').toLowerCase();
    if (scheme === 'bitcoin' || scheme === 'lightning') {
      const dest = getDestination(text);
      if (dest !== undefined) {
        this.destinations.push({ value: dest, type: getDestinationType(text) });
      }

      const queryParams = parseQueryString(uri.search);
      this.onChainEncryptionText = queryParams.get('branta_id');
      this.onChainEncryptionSecret = queryParams.get('branta_secret');

      const lightningValue = queryParams.get('lightning');
      if (lightningValue !== undefined) {
        this.destinations.push({ value: lightningValue, type: detectPlainTextType(lightningValue) });
      }

      const bolt12Value = queryParams.get('bolt12');
      if (bolt12Value !== undefined) {
        this.destinations.push({ value: bolt12Value, type: detectPlainTextType(bolt12Value) });
      }

      const arkValue = queryParams.get('ark');
      if (arkValue !== undefined) {
        this.destinations.push({ value: arkValue, type: detectPlainTextType(arkValue) });
      }

      const silentPaymentValue = queryParams.get('silent_payment');
      if (silentPaymentValue !== undefined) {
        this.destinations.push({ value: silentPaymentValue, type: detectPlainTextType(silentPaymentValue) });
      }

      return;
    }

    this.destinations.push({ value: text });
  }

  get destination(): string | undefined {
    return this.destinations[0]?.value;
  }

  get destinationType(): DestinationType | undefined {
    return this.destinations[0]?.type;
  }

  isOnChainZk(): boolean {
    return this.onChainEncryptionText !== undefined && this.onChainEncryptionSecret !== undefined;
  }
}

export { detectPlainTextType };
