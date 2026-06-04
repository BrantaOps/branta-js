import { describe, expect, test } from '@jest/globals';

import { BrantaServerBaseUrl } from '../../src/enums/brantaServerBaseUrl.js';
import {
  getHashZkType,
  getUrl,
  isArk,
  isBolt11,
  isSilentPayment,
  toNormalizedHash,
  toUrlFragment,
} from '../../src/extensions/brantaExtensions.js';
import { DestinationType } from '../../src/enums/destinationType.js';

describe('BrantaExtensions', () => {
  test('getUrl_localhost', () => {
    expect(getUrl(BrantaServerBaseUrl.Localhost)).toBe('http://localhost:3000');
  });

  test('getUrl_production', () => {
    expect(getUrl(BrantaServerBaseUrl.Production)).toBe('https://guardrail.branta.pro');
  });

  test('getUrl_staging', () => {
    expect(getUrl(BrantaServerBaseUrl.Staging)).toBe('https://staging.guardrail.branta.pro');
  });

  // isBolt11

  test('isBolt11_returnsTrue_forLnbcPrefix', () => {
    expect(isBolt11('lnbc100n1ptest')).toBe(true);
  });

  test('isBolt11_returnsTrue_forLntbPrefix', () => {
    expect(isBolt11('lntb100n1ptest')).toBe(true);
  });

  test('isBolt11_returnsTrue_forLnbcrtPrefix', () => {
    expect(isBolt11('lnbcrt100n1ptest')).toBe(true);
  });

  test('isBolt11_isCaseInsensitive', () => {
    expect(isBolt11('LNBC100N1PTEST')).toBe(true);
  });

  test('isBolt11_returnsFalse_forNonBolt11Values', () => {
    expect(isBolt11('bc1qabc')).toBe(false);
    expect(isBolt11('ark1qqjqtest')).toBe(false);
  });

  // isArk

  test('isArk_returnsTrue_forArk1Prefix', () => {
    expect(isArk('ark1qqjqtest')).toBe(true);
  });

  test('isArk_isCaseInsensitive', () => {
    expect(isArk('ARK1QQJQTEST')).toBe(true);
  });

  test('isArk_returnsFalse_forNonArkValues', () => {
    expect(isArk('bc1qabc')).toBe(false);
  });

  // isSilentPayment

  test('isSilentPayment_returnsTrue_forSp1Prefix', () => {
    expect(isSilentPayment('sp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw')).toBe(true);
  });

  test('isSilentPayment_returnsTrue_forTsp1Prefix', () => {
    expect(isSilentPayment('tsp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw')).toBe(true);
  });

  test('isSilentPayment_isCaseInsensitive', () => {
    expect(isSilentPayment('SP1QQWL5P9JHZ')).toBe(true);
  });

  test('isSilentPayment_returnsFalse_forNonSpValues', () => {
    expect(isSilentPayment('bc1qabc')).toBe(false);
    expect(isSilentPayment('ark1qqjqtest')).toBe(false);
  });

  // getHashZkType

  test('getHashZkType_returnsBolt11_forBolt11Invoice', () => {
    expect(getHashZkType('lnbc100n1ptest')).toBe(DestinationType.Bolt11);
  });

  test('getHashZkType_returnsArkAddress_forArkAddress', () => {
    expect(getHashZkType('ark1qqjqtest')).toBe(DestinationType.ArkAddress);
  });

  test('getHashZkType_returnsSilentPayment_forSilentPaymentAddress', () => {
    expect(getHashZkType('sp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw')).toBe(DestinationType.SilentPayment);
  });

  test('getHashZkType_returnsUndefined_forBitcoinAddress', () => {
    expect(getHashZkType('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBeUndefined();
  });

  // toNormalizedHash

  test('toNormalizedHash_returns64CharUppercaseHex', async () => {
    const hash = await toNormalizedHash('lnbc100n1ptest');
    expect(hash).toMatch(/^[0-9A-F]{64}$/);
  });

  test('toNormalizedHash_isCaseInsensitive', async () => {
    const hash = await toNormalizedHash('lnbc100n1ptest');
    const hashUpper = await toNormalizedHash('LNBC100N1PTEST');
    expect(hash).toBe(hashUpper);
  });

  // toUrlFragment

  test('toUrlFragment_formatsPairsWithKPrefix', () => {
    expect(toUrlFragment({ zkId1: 'secret1' })).toBe('#k-zkId1=secret1');
  });

  test('toUrlFragment_joinsMultiplePairsWithAmpersand', () => {
    expect(toUrlFragment({ a: '1', b: '2' })).toBe('#k-a=1&k-b=2');
  });
});
