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
});
