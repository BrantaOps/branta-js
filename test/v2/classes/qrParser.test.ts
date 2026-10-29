import { describe, expect, test } from '@jest/globals';

import { DestinationType } from '../../../src/enums/destinationType.js';
import { QRParser } from '../../../src/v2/classes/qrParser.js';

describe('QRParser', () => {
  test('qrParser_bitcoinUri_setsBitcoinAddressTypeAndDestination', () => {
    const result = new QRParser('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');

    expect(result.destination).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
    expect(result.onChainEncryptionText).toBeUndefined();
    expect(result.onChainEncryptionSecret).toBeUndefined();
  });

  test('qrParser_bitcoinUriWithBrantaParams_setsBrantaParams', () => {
    const result = new QRParser('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?branta_id=abc%2Bdef%3D&branta_secret=1234');

    expect(result.destination).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
    expect(result.onChainEncryptionText).toBe('abc+def=');
    expect(result.onChainEncryptionSecret).toBe('1234');
  });

  test('qrParser_bitcoinUri_decodesUriEncodedLightningParam', () => {
    const result = new QRParser('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?lightning=lnbc100n1ptest%3Dpadded');

    expect(result.destinations).toHaveLength(2);
    expect(result.destinations[1]!.value).toBe('lnbc100n1ptest=padded');
    expect(result.destinations[1]!.type).toBe(DestinationType.Bolt11);
  });

  test('qrParser_bareBitcoinAddress_setsBitcoinAddressType', () => {
    const result = new QRParser('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');

    expect(result.destination).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
  });

  test.each(['tb1qtestaddress', 'TB1QTESTADDRESS', 'bcrt1qtestaddress', 'BCRT1QTESTADDRESS'])(
    'qrParser_bareTestnetBech32_%s_setsBitcoinAddressType',
    (address) => {
      const result = new QRParser(address);

      expect(result.destination).toBe(address);
      expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
    },
  );

  test('qrParser_lightningBolt11Uri_setsBolt11Type', () => {
    const result = new QRParser('lightning:lnbc100n1ptest');

    expect(result.destination).toBe('lnbc100n1ptest');
    expect(result.destinationType).toBe(DestinationType.Bolt11);
  });

  test('qrParser_bareBolt11_setsBolt11Type', () => {
    const result = new QRParser('lnbc100n1ptest');

    expect(result.destination).toBe('lnbc100n1ptest');
    expect(result.destinationType).toBe(DestinationType.Bolt11);
  });

  test('qrParser_lightningBolt12Uri_setsBolt12Type', () => {
    const result = new QRParser('lightning:lno1qcptest');

    expect(result.destination).toBe('lno1qcptest');
    expect(result.destinationType).toBe(DestinationType.Bolt12);
  });

  test('qrParser_plainBolt12_setsBolt12Type', () => {
    const result = new QRParser('lno1qcptest');

    expect(result.destination).toBe('lno1qcptest');
    expect(result.destinationType).toBe(DestinationType.Bolt12);
  });

  test('qrParser_lightningLnUrlUri_setsLnUrlType', () => {
    const result = new QRParser('lightning:LNURL1DP68GURN8GHJ');

    expect(result.destination).toBe('LNURL1DP68GURN8GHJ');
    expect(result.destinationType).toBe(DestinationType.LnUrl);
  });

  test('qrParser_plainLnUrl_setsLnUrlType', () => {
    const result = new QRParser('LNURL1DP68GURN8GHJ');

    expect(result.destination).toBe('LNURL1DP68GURN8GHJ');
    expect(result.destinationType).toBe(DestinationType.LnUrl);
  });

  test('qrParser_ethereumAddress_setsTetherAddressType', () => {
    const result = new QRParser('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

    expect(result.destination).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(result.destinationType).toBe(DestinationType.TetherAddress);
  });

  test('qrParser_tronAddress_setsTetherAddressType', () => {
    const result = new QRParser('TJmUNSGV6b1CCVXN1KkABY49nUJGWDH3Hd');

    expect(result.destination).toBe('TJmUNSGV6b1CCVXN1KkABY49nUJGWDH3Hd');
    expect(result.destinationType).toBe(DestinationType.TetherAddress);
  });

  test('qrParser_arkAddress_setsArkAddressType', () => {
    const result = new QRParser('ark1qqjqtest');

    expect(result.destination).toBe('ark1qqjqtest');
    expect(result.destinationType).toBe(DestinationType.ArkAddress);
  });

  test('qrParser_signetArkAddress_setsArkAddressType', () => {
    const result = new QRParser('tark1qqjqtest');

    expect(result.destination).toBe('tark1qqjqtest');
    expect(result.destinationType).toBe(DestinationType.ArkAddress);
  });

  test('qrParser_silentPaymentAddress_setsSilentPaymentType', () => {
    const result = new QRParser('sp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw');

    expect(result.destination).toBe('sp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw');
    expect(result.destinationType).toBe(DestinationType.SilentPayment);
  });

  test('qrParser_testnetSilentPaymentAddress_setsSilentPaymentType', () => {
    const result = new QRParser('tsp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw');

    expect(result.destination).toBe('tsp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw');
    expect(result.destinationType).toBe(DestinationType.SilentPayment);
  });

  test('qrParser_unrecognizedText_setsUndefinedType', () => {
    const result = new QRParser('not-any-known-format');

    expect(result.destination).toBe('not-any-known-format');
    expect(result.destinationType).toBeUndefined();
  });

  test('qrParser_leadingTrailingWhitespace_isTrimmed', () => {
    const result = new QRParser('  lnbc100n1ptest  ');

    expect(result.destination).toBe('lnbc100n1ptest');
    expect(result.destinationType).toBe(DestinationType.Bolt11);
  });

  test('qrParser_combinedQR_shouldParse', () => {
    const result = new QRParser('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?&lightning=lnbc100n1ptest');

    expect(result.destinations).toHaveLength(2);
    expect(result.destination).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
    expect(result.destinations[1]!.value).toBe('lnbc100n1ptest');
    expect(result.destinations[1]!.type).toBe(DestinationType.Bolt11);
    expect(result.hasBrantaParams()).toBe(false);
  });

  test('qrParser_combinedQRWithMultipleAlts_shouldParse', () => {
    const result = new QRParser('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?&lightning=lnbc100n1ptest&ark=ark100testaddress');

    expect(result.destinations).toHaveLength(3);
    expect(result.destination).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
    expect(result.destinations[1]!.value).toBe('lnbc100n1ptest');
    expect(result.destinations[1]!.type).toBe(DestinationType.Bolt11);
    expect(result.destinations[2]!.value).toBe('ark100testaddress');
    expect(result.destinations[2]!.type).toBe(DestinationType.ArkAddress);
    expect(result.hasBrantaParams()).toBe(false);
  });

  test('qrParser_bitcoinUriWithSilentPaymentParam_addsSilentPaymentDestination', () => {
    const result = new QRParser('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?silent_payment=sp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw');

    expect(result.destinations).toHaveLength(2);
    expect(result.destination).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
    expect(result.destinations[1]!.value).toBe('sp1qqwl5p9jhz0000h5zkvlf9gfqv9dl9qjp5ggq5x3fw');
    expect(result.destinations[1]!.type).toBe(DestinationType.SilentPayment);
  });

  // URL parsers drop tab/LF/CR anywhere and leading C0 controls before reading the
  // scheme. Destination typing has to see that same text, or a hidden character
  // inside "bitcoin" leaves the address untyped and the swap check never runs.
  test.each([
    ['tab', 'bitcoi\tn:'],
    ['line feed', 'bitcoi\nn:'],
    ['carriage return', 'bitcoi\rn:'],
    ['leading control', '\x01bitcoin:'],
  ])('qrParser_controlCharInScheme_%s_typesBitcoinAddress', (_label, prefix) => {
    const result = new QRParser(`${prefix}1attackeraddr?branta_id=ID1&branta_secret=SEC1`);

    expect(result.hasBrantaParams()).toBe(true);
    expect(result.destination).toBe('1attackeraddr');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
    expect(result.onChainEncryptionText).toBe('ID1');
    expect(result.onChainEncryptionSecret).toBe('SEC1');
  });

  test('qrParser_tabInsideAddress_usesTheAddressAUrlParserWouldPay', () => {
    const result = new QRParser('bitcoin:1attac\tkeraddr?branta_id=ID1&branta_secret=SEC1');

    expect(result.destination).toBe('1attackeraddr');
    expect(result.destinationType).toBe(DestinationType.BitcoinAddress);
  });

  test('qrParser_bip321BcAndTb_areOnChainAddresses', () => {
    const result = new QRParser('bitcoin:?bc=bc1qmerchant&tb=tb1qtest');

    expect(result.destination).toBe('');
    expect(result.destinations.map((d) => d.value)).toEqual(['', 'bc1qmerchant', 'tb1qtest']);
    expect(result.destinations[1]!.type).toBe(DestinationType.BitcoinAddress);
    expect(result.destinations[2]!.type).toBe(DestinationType.BitcoinAddress);
    expect(result.hasUnverifiableInstruction).toBe(false);
  });

  test('qrParser_spParam_addsSilentPayment', () => {
    const result = new QRParser('bitcoin:bc1qmerchant?sp=sp1qqexample');

    expect(result.destinations[1]).toMatchObject({
      value: 'sp1qqexample',
      type: DestinationType.SilentPayment,
    });
    expect(result.hasUnverifiableInstruction).toBe(false);
  });

  test('qrParser_lnoAndPay_areUnverifiable', () => {
    const lno = new QRParser('bitcoin:bc1qmerchant?lno=lno1qqexample');
    expect(lno.destinations[1]).toMatchObject({ value: 'lno1qqexample', type: DestinationType.Bolt12 });
    expect(lno.hasUnverifiableInstruction).toBe(true);

    const pay = new QRParser('bitcoin:bc1qmerchant?pay=bitcoin:bc1qother');
    expect(pay.hasUnverifiableInstruction).toBe(true);
    expect(pay.destinations.map((d) => d.value)).toEqual(['bc1qmerchant']);
  });

  test('qrParser_tabInsideLightningScheme_stillTypesBolt11', () => {
    const result = new QRParser('lightnin\tg:lnbc100n1ptest');

    expect(result.destination).toBe('lnbc100n1ptest');
    expect(result.destinationType).toBe(DestinationType.Bolt11);
  });
});
