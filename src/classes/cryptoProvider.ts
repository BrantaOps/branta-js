import { gcm } from '@noble/ciphers/aes.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';

type Bytes = Uint8Array<ArrayBuffer>;

// SubtleCrypto is only exposed in secure contexts (HTTPS or localhost). Pages
// served over plain HTTP (e.g. self-hosted node UIs on Umbrel/Start9) have
// `crypto.getRandomValues` but no `crypto.subtle`, so every primitive below
// falls back to a pure-JS implementation from the audited @noble packages.
const getSubtle = (): SubtleCrypto | undefined => (globalThis as { crypto?: Crypto }).crypto?.subtle;

export const getRandomBytes = (length: number): Bytes => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.getRandomValues) {
    throw new Error('crypto.getRandomValues is not available. See README for React Native polyfill instructions.');
  }
  return c.getRandomValues(new Uint8Array(length));
};

export const sha256 = async (bytes: Bytes): Promise<Bytes> => {
  const subtle = getSubtle();
  if (subtle) {
    return new Uint8Array(await subtle.digest('SHA-256', bytes));
  }
  return nobleSha256(bytes) as Bytes;
};

export const hmacSha256 = async (keyBytes: Bytes, messageBytes: Bytes): Promise<Bytes> => {
  const subtle = getSubtle();
  if (subtle) {
    const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', key, messageBytes));
  }
  return hmac(nobleSha256, keyBytes, messageBytes) as Bytes;
};

export const aesGcmEncrypt = async (keyData: Bytes, iv: Bytes, plaintext: Bytes): Promise<Bytes> => {
  const subtle = getSubtle();
  if (subtle) {
    const key = await subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt']);
    return new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, plaintext));
  }
  return gcm(keyData, iv).encrypt(plaintext) as Bytes;
};

export const aesGcmDecrypt = async (keyData: Bytes, iv: Bytes, ciphertextAndTag: Bytes): Promise<Bytes> => {
  const subtle = getSubtle();
  if (subtle) {
    const key = await subtle.importKey('raw', keyData, 'AES-GCM', false, ['decrypt']);
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ciphertextAndTag));
  }
  return gcm(keyData, iv).decrypt(ciphertextAndTag) as Bytes;
};
