import { describe, expect, test } from '@jest/globals';

import { AesEncryption } from '../../src/classes/aesEncryption.js';

describe('AesEncryption', () => {
  test('encryptAndDecrypt', async () => {
    const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const secret = '12345';

    const encryptedValue = await AesEncryption.encrypt(address, secret);

    expect(await AesEncryption.decrypt(encryptedValue, secret)).toBe(address);
  });

  test('encrypt_deterministicNonce_producesSameOutput', async () => {
    const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const secret = '12345';

    const first = await AesEncryption.encrypt(address, secret, true);
    const second = await AesEncryption.encrypt(address, secret, true);

    expect(first).toBe(second);
  });

  test('encrypt_randomNonce_producesDifferentOutput', async () => {
    const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const secret = '12345';

    const first = await AesEncryption.encrypt(address, secret);
    const second = await AesEncryption.encrypt(address, secret);

    expect(first).not.toBe(second);
  });

  test('roundTrip_withoutTextDecoderOrBase64Globals', async () => {
    const address = 'tb1qshra2mlujc9wfscvn4d8aqpyqgxzl55853xg7s';
    const secret = 'test-secret-hermes';
    const globals = globalThis as {
      TextEncoder?: typeof TextEncoder;
      TextDecoder?: typeof TextDecoder;
      btoa?: typeof btoa;
      atob?: typeof atob;
    };
    const saved = {
      TextEncoder: globals.TextEncoder,
      TextDecoder: globals.TextDecoder,
      btoa: globals.btoa,
      atob: globals.atob,
    };
    delete globals.TextEncoder;
    delete globals.TextDecoder;
    delete globals.btoa;
    delete globals.atob;
    try {
      const encrypted = await AesEncryption.encrypt(address, secret, true);
      expect(await AesEncryption.decrypt(encrypted, secret)).toBe(address);
      const unicode = 'café ¥';
      const encryptedUnicode = await AesEncryption.encrypt(unicode, secret, true);
      expect(await AesEncryption.decrypt(encryptedUnicode, secret)).toBe(unicode);
    } finally {
      globals.TextEncoder = saved.TextEncoder;
      globals.TextDecoder = saved.TextDecoder;
      globals.btoa = saved.btoa;
      globals.atob = saved.atob;
    }
  });
});
