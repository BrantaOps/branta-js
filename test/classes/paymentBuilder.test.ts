import { describe, expect, test } from '@jest/globals';

import { DestinationType } from '../../src/enums/destinationType.js';
import { Payment } from '../../src/models/payment.js';
import { PaymentBuilder } from '../../src/classes/paymentBuilder.js';
import { destinationFromApi, destinationToApi, paymentFromApi, paymentToApi } from '../../src/services/serialization.js';

const BitcoinAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const Bolt11Invoice = 'lnbc100n1ptest';

describe('PaymentBuilder', () => {
  test('addDestination_withType_setsTypeOnDestination', () => {
    const payment = new PaymentBuilder()
      .addDestination('addr1', DestinationType.BitcoinAddress)
      .build();

    expect(payment.destinations[0]!.type).toBe(DestinationType.BitcoinAddress);
  });

  test('addDestination_withoutType_typeIsUndefined', () => {
    const payment = new PaymentBuilder()
      .addDestination('addr1')
      .build();

    expect(payment.destinations[0]!.type).toBeUndefined();
  });

  test.each([
    [DestinationType.BitcoinAddress, 'bitcoin_address'],
    [DestinationType.Bolt11, 'bolt11'],
    [DestinationType.ArkAddress, 'ark_address'],
    [DestinationType.SilentPayment, 'silent_payment'],
    [DestinationType.UsdtPolygon, 'usdt_polygon'],
    [DestinationType.UsdcPolygon, 'usdc_polygon'],
  ])('destinationType_serializesToCorrectJsonString (%s)', (type, expected) => {
    const destination = { value: 'addr', type } as const;
    const apiObject = destinationToApi(destination);
    const json = JSON.stringify(apiObject);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed['type']).toBe(expected);
  });

  test('destinationFromApi_unknownType_isOmitted', () => {
    const destination = destinationFromApi({ value: 'addr', type: 'not_a_destination_type', zk: true });

    expect(destination.type).toBeUndefined();
  });

  test('destinationType_undefinedOmittedFromJson', () => {
    const destination = { value: 'addr' };
    const apiObject = destinationToApi(destination);
    const json = JSON.stringify(apiObject);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed['type']).toBeUndefined();
  });

  test('addDestination_assignsId', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
      .build();

    expect(payment.destinations[0]!.id).toBeDefined();
    expect(payment.destinations[0]!.id!.length).toBeGreaterThan(0);
  });

  test('addDestination_assignsIdOnEveryDestination', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
      .addDestination(Bolt11Invoice, DestinationType.Bolt11)
      .build();

    expect(payment.destinations[0]!.id).toBeDefined();
    expect(payment.destinations[1]!.id).toBeDefined();
  });

  test('destinationToApi_alwaysSendsZkTrue', () => {
    const payment = new PaymentBuilder().addDestination(BitcoinAddress).build();
    const apiObject = destinationToApi(payment.destinations[0]!);

    expect(apiObject['zk']).toBe(true);
    expect(apiObject['zk_id']).toBe(payment.destinations[0]!.id);
  });

  test('setDescription_writesMetadataDescription', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setDescription('test desc')
      .build();

    expect(payment.description).toBeUndefined();
    expect(JSON.parse(payment.metadata!)).toEqual({ description: 'test desc' });
  });

  test('paymentToApi_omitsDescription', () => {
    const api = paymentToApi({ destinations: [], description: 'plaintext' });

    expect(api['description']).toBeUndefined();
  });

  test('paymentFromApi_ignoresDescription', () => {
    const payment = paymentFromApi({ destinations: [], description: 'plaintext' });

    expect(payment.description).toBeUndefined();
  });

  test('setTtl_setsTtl', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setTtl(3600)
      .build();

    expect(payment.ttl).toBe(3600);
  });

  test('addMetadata_addsKeyValuePairToMetadataJson', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .addMetadata('orderId', '123')
      .build();

    expect(payment.metadata).toContain('"orderId"');
    expect(payment.metadata).toContain('"123"');
  });

  test('setBrand_setsName', () => {
    const payment = new PaymentBuilder().addDestination(BitcoinAddress).setBrand('Acme').build();

    expect(payment.brand!.name).toBe('Acme');
  });

  test('setBrand_optionalUrlsUndefinedByDefault', () => {
    const payment = new PaymentBuilder().addDestination(BitcoinAddress).setBrand('Acme').build();

    expect(payment.brand!.logoUrl).toBeUndefined();
    expect(payment.brand!.logoLightUrl).toBeUndefined();
  });

  test('setBrand_withUrls_setsUrls', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setBrand('Acme', 'https://example.com/logo.png', 'https://example.com/logo-light.png')
      .build();

    expect(payment.brand!.logoUrl).toBe('https://example.com/logo.png');
    expect(payment.brand!.logoLightUrl).toBe('https://example.com/logo-light.png');
  });

  test('setBrand_returnsBuilder', () => {
    const builder = new PaymentBuilder().addDestination(BitcoinAddress);

    expect(builder.setBrand('Acme')).toBe(builder);
  });

  test('setBrand_serializesToApiAsBrandOnly', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setBrand('Acme', 'https://example.com/logo.png')
      .build();

    const api = paymentToApi(payment);
    const brand = api['brand'] as Record<string, unknown>;

    expect(brand['name']).toBe('Acme');
    expect(brand['logo_url']).toBe('https://example.com/logo.png');
    expect(brand['logo_light_url']).toBeUndefined();
    expect(api).not.toHaveProperty('child_platform');
  });

  test('setChildPlatform_deprecatedAlias_writesBrand', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setChildPlatform('Acme', 'https://example.com/logo.png', 'https://example.com/logo-light.png')
      .build();

    expect(payment.brand).toEqual({
      name: 'Acme',
      logoUrl: 'https://example.com/logo.png',
      logoLightUrl: 'https://example.com/logo-light.png',
    });
  });

  test('setChildPlatform_returnsBuilder', () => {
    const builder = new PaymentBuilder().addDestination(BitcoinAddress);
    const result = builder.setChildPlatform('Acme');

    expect(result).toBe(builder);
  });

  test('setChildPlatform_serializesToIdenticalBrandWireBody', () => {
    const viaBrand = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setBrand('Acme', 'https://example.com/logo.png')
      .build();
    const viaAlias = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setChildPlatform('Acme', 'https://example.com/logo.png')
      .build();
    // Destination ids are random; compare the brand portion of the wire body.
    const brandOf = (p: typeof viaBrand) => paymentToApi(p)['brand'];

    expect(brandOf(viaAlias)).toEqual(brandOf(viaBrand));
    expect(paymentToApi(viaAlias)).not.toHaveProperty('child_platform');
  });

  test('paymentWithOnlyDeprecatedField_serializesAsBrand', () => {
    const payment: Payment = {
      destinations: [{ value: BitcoinAddress }],
      childPlatform: { name: 'Old', logoUrl: 'https://example.com/old.png' },
    };

    const api = paymentToApi(payment);

    expect(api['brand']).toEqual({ name: 'Old', logo_url: 'https://example.com/old.png' });
    expect(api).not.toHaveProperty('child_platform');
  });

  test('paymentWithBothFields_brandWins', () => {
    const payment: Payment = {
      destinations: [{ value: BitcoinAddress }],
      brand: { name: 'New' },
      childPlatform: { name: 'Old', logoUrl: 'https://example.com/old.png' },
    };

    const api = paymentToApi(payment);

    expect(api['brand']).toEqual({ name: 'New' });
    expect(api).not.toHaveProperty('child_platform');
  });

  test('noBrand_omittedFromApi', () => {
    const payment = new PaymentBuilder().addDestination(BitcoinAddress).build();

    const api = paymentToApi(payment);

    expect(api['brand']).toBeUndefined();
    expect(api).not.toHaveProperty('child_platform');
  });

  test('paymentFromApi_brand_populatesBrandAndMirrorsChildPlatform', () => {
    const payment = paymentFromApi({
      destinations: [],
      brand: { name: 'Acme', logo_url: 'https://example.com/a.png', logo_light_url: 'https://example.com/b.png' },
    });
    const expected = { name: 'Acme', logoUrl: 'https://example.com/a.png', logoLightUrl: 'https://example.com/b.png' };

    expect(payment.brand).toEqual(expected);
    expect(payment.childPlatform).toEqual(expected);
  });

  test('paymentFromApi_childPlatform_populatesBrandAndMirrorsChildPlatform', () => {
    const payment = paymentFromApi({ destinations: [], child_platform: { name: 'Old', logo_url: 'https://example.com/o.png' } });
    const expected = { name: 'Old', logoUrl: 'https://example.com/o.png' };

    expect(payment.brand).toEqual(expected);
    expect(payment.childPlatform).toEqual(expected);
  });

  test('paymentFromApi_both_brandWins', () => {
    const payment = paymentFromApi({
      destinations: [],
      brand: { name: 'New' },
      child_platform: { name: 'Old', logo_url: 'https://example.com/o.png' },
    });

    expect(payment.brand).toEqual({ name: 'New' });
    expect(payment.childPlatform).toEqual({ name: 'New' });
  });

  test('paymentFromApi_neither_leavesBothUndefined', () => {
    const payment = paymentFromApi({ destinations: [] });

    expect(payment.brand).toBeUndefined();
    expect(payment.childPlatform).toBeUndefined();
  });
});
