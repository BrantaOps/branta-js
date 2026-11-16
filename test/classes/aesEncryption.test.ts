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

  // Fixed vectors. Every Branta SDK asserts the same strings, so a payment written by one SDK
  // stays readable and findable by every other. Do not regenerate these from this code.
  test('encrypt_fixedVector_matchesEverySdk', async () => {
    expect(await AesEncryption.encrypt('hello world', 'my-secret', true)).toBe(
      'mPIKHc3ywVlsBHf3Lv2Rwpz2+fKE0kgUePq2m4fPIUidMuGEHVIB',
    );
  });

  test('decrypt_fixedVector_returnsPlaintext', async () => {
    expect(await AesEncryption.decrypt('mPIKHc3ywVlsBHf3Lv2Rwpz2+fKE0kgUePq2m4fPIUidMuGEHVIB', 'my-secret')).toBe(
      'hello world',
    );
  });

  test('encrypt_derivedKeyFixedVector_matchesEverySdk', async () => {
    // Key is the normalized hash of 'LNBC10U1PTestInvoice'. The value is encrypted lowercased.
    const key = '261D7974DC0541402A222AC17973D3FF412878C1C179FCD4D866094D610B4496';
    expect(await AesEncryption.encrypt('lnbc10u1ptestinvoice', key, true)).toBe(
      'WywBRexAiHTi2mnHK/W1DIN79bF1XVhU3BdC3DWpUsdhs5NMbdyZyzWsdjfuFgIV',
    );
  });
});
