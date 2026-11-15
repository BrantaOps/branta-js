/**
 * UTF-8 and base64 used by AES payloads.
 *
 * Browsers and Node provide TextEncoder, TextDecoder, btoa, and atob.
 * React Native Hermes often has TextEncoder and not TextDecoder, and some
 * builds omit btoa/atob. Missing globals used to throw inside decrypt and
 * surface as verify() status "unknown". Fall back to pure JavaScript so a
 * present noble/Web Crypto provider can still decrypt.
 */

type Bytes = Uint8Array<ArrayBuffer>;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const hasTextEncoder = (): boolean => typeof globalThis.TextEncoder === 'function';
const hasTextDecoder = (): boolean => typeof globalThis.TextDecoder === 'function';
const hasBtoa = (): boolean => typeof globalThis.btoa === 'function';
const hasAtob = (): boolean => typeof globalThis.atob === 'function';

function encodeUtf8Fallback(text: string): Bytes {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)!;
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(out);
}

function decodeUtf8Fallback(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i]!;
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i += 1;
      continue;
    }
    let code: number;
    let size: number;
    if (b0 >= 0xc2 && b0 < 0xe0 && i + 1 < bytes.length) {
      size = 2;
      code = ((b0 & 0x1f) << 6) | (bytes[i + 1]! & 0x3f);
    } else if (b0 >= 0xe0 && b0 < 0xf0 && i + 2 < bytes.length) {
      size = 3;
      code = ((b0 & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f);
    } else if (b0 >= 0xf0 && b0 < 0xf8 && i + 3 < bytes.length) {
      size = 4;
      code =
        ((b0 & 0x07) << 18) |
        ((bytes[i + 1]! & 0x3f) << 12) |
        ((bytes[i + 2]! & 0x3f) << 6) |
        (bytes[i + 3]! & 0x3f);
    } else {
      out += '\uFFFD';
      i += 1;
      continue;
    }
    if (code < 0x10000) {
      out += String.fromCharCode(code);
    } else {
      const shifted = code - 0x10000;
      out += String.fromCharCode(0xd800 + (shifted >> 10), 0xdc00 + (shifted & 0x3ff));
    }
    i += size;
  }
  return out;
}

function encodeBase64Fallback(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const has1 = i + 1 < bytes.length;
    const has2 = i + 2 < bytes.length;
    const b1 = has1 ? bytes[i + 1]! : 0;
    const b2 = has2 ? bytes[i + 2]! : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += BASE64_ALPHABET[(triple >> 18) & 63];
    out += BASE64_ALPHABET[(triple >> 12) & 63];
    out += has1 ? BASE64_ALPHABET[(triple >> 6) & 63] : '=';
    out += has2 ? BASE64_ALPHABET[triple & 63] : '=';
  }
  return out;
}

function decodeBase64Fallback(value: string): Bytes {
  if (value.length % 4 !== 0) {
    throw new Error('Invalid base64');
  }
  const pad = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const outLen = (value.length / 4) * 3 - pad;
  const out = new Uint8Array(outLen);
  let o = 0;
  for (let i = 0; i < value.length; i += 4) {
    const c0 = BASE64_ALPHABET.indexOf(value[i]!);
    const c1 = BASE64_ALPHABET.indexOf(value[i + 1]!);
    const c2char = value[i + 2]!;
    const c3char = value[i + 3]!;
    const c2 = c2char === '=' ? 0 : BASE64_ALPHABET.indexOf(c2char);
    const c3 = c3char === '=' ? 0 : BASE64_ALPHABET.indexOf(c3char);
    if (c0 < 0 || c1 < 0 || (c2char !== '=' && c2 < 0) || (c3char !== '=' && c3 < 0)) {
      throw new Error('Invalid base64');
    }
    const triple = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (o < outLen) out[o++] = (triple >> 16) & 0xff;
    if (o < outLen) out[o++] = (triple >> 8) & 0xff;
    if (o < outLen) out[o++] = triple & 0xff;
  }
  return out;
}

export function encodeUtf8(text: string): Bytes {
  if (hasTextEncoder()) {
    return new TextEncoder().encode(text) as Bytes;
  }
  return encodeUtf8Fallback(text);
}

export function decodeUtf8(bytes: Uint8Array): string {
  if (hasTextDecoder()) {
    return new TextDecoder().decode(bytes);
  }
  return decodeUtf8Fallback(bytes);
}

export function encodeBase64(bytes: Uint8Array): string {
  if (hasBtoa()) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }
  return encodeBase64Fallback(bytes);
}

export function decodeBase64(value: string): Bytes {
  if (hasAtob()) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return decodeBase64Fallback(value);
}
