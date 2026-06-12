import { describe, expect, test } from '@jest/globals';

import { AesEncryption } from '../../src/classes/aesEncryption.js';
import { aesGcmDecrypt, aesGcmEncrypt, getRandomBytes, hmacSha256, sha256 } from '../../src/classes/cryptoProvider.js';
import { toNormalizedHash } from '../../src/extensions/brantaExtensions.js';

const realCrypto = globalThis.crypto;

// Simulates an insecure browser context (plain HTTP): `crypto.getRandomValues`
// exists but `crypto.subtle` does not.
const withoutSubtle = async <T>(fn: () => Promise<T>): Promise<T> => {
  const insecureCrypto = {
    getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
  } as Crypto;
  Object.defineProperty(globalThis, 'crypto', { value: insecureCrypto, configurable: true });
  try {
    return await fn();
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
  }
};

const utf8 = (text: string) => new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>;

describe('cryptoProvider without crypto.subtle', () => {
  test('sha256 fallback matches Web Crypto output', async () => {
    const input = utf8('lnbc1pvjluezpp5qqqsyq');

    const expected = await sha256(input);
    const actual = await withoutSubtle(() => sha256(input));

    expect(Array.from(actual)).toEqual(Array.from(expected));
  });

  test('hmacSha256 fallback matches Web Crypto output', async () => {
    const key = utf8('secret-key');
    const message = utf8('message-body');

    const expected = await hmacSha256(key, message);
    const actual = await withoutSubtle(() => hmacSha256(key, message));

    expect(Array.from(actual)).toEqual(Array.from(expected));
  });

  test('aesGcm fallback round-trips and interoperates with Web Crypto', async () => {
    const key = await sha256(utf8('12345'));
    const iv = utf8('0123456789ab').slice(0, 12) as Uint8Array<ArrayBuffer>;
    const plaintext = utf8('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');

    const encryptedWithFallback = await withoutSubtle(() => aesGcmEncrypt(key, iv, plaintext));
    const encryptedWithWebCrypto = await aesGcmEncrypt(key, iv, plaintext);

    expect(Array.from(encryptedWithFallback)).toEqual(Array.from(encryptedWithWebCrypto));

    const decryptedWithWebCrypto = await aesGcmDecrypt(key, iv, encryptedWithFallback);
    const decryptedWithFallback = await withoutSubtle(() => aesGcmDecrypt(key, iv, encryptedWithWebCrypto));

    expect(Array.from(decryptedWithWebCrypto)).toEqual(Array.from(plaintext));
    expect(Array.from(decryptedWithFallback)).toEqual(Array.from(plaintext));
  });

  test('getRandomBytes works without crypto.subtle', async () => {
    const bytes = await withoutSubtle(async () => getRandomBytes(12));

    expect(bytes.length).toBe(12);
  });

  test('AesEncryption round-trips without crypto.subtle', async () => {
    const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const secret = '12345';

    const decrypted = await withoutSubtle(async () => {
      const encrypted = await AesEncryption.encrypt(address, secret);
      return AesEncryption.decrypt(encrypted, secret);
    });

    expect(decrypted).toBe(address);
  });

  test('deterministic encryption produces identical output with and without crypto.subtle', async () => {
    const invoice = 'lnbc20m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypq';
    const key = await toNormalizedHash(invoice);

    const withWebCrypto = await AesEncryption.encrypt(invoice, key, true);
    const withFallback = await withoutSubtle(() => AesEncryption.encrypt(invoice, key, true));

    expect(withFallback).toBe(withWebCrypto);
  });

  test('toNormalizedHash works without crypto.subtle', async () => {
    const invoice = 'LNBC20m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypq';

    const expected = await toNormalizedHash(invoice);
    const actual = await withoutSubtle(() => toNormalizedHash(invoice));

    expect(actual).toBe(expected);
    expect(actual).toMatch(/^[0-9A-F]{64}$/);
  });
});
