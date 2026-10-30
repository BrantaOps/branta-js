import { describe, expect, test } from '@jest/globals';

import { DestinationType } from '../../src/enums/destinationType.js';
import { PaymentBuilder } from '../../src/classes/paymentBuilder.js';
import { destinationFromApi, destinationToApi, paymentToApi } from '../../src/services/serialization.js';

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

  test('setDescription_setsDescription', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setDescription('test desc')
      .build();

    expect(payment.description).toBe('test desc');
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

  test('setChildPlatform_setsName', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setChildPlatform('Acme')
      .build();

    expect(payment.childPlatform!.name).toBe('Acme');
  });

  test('setChildPlatform_optionalUrlsUndefinedByDefault', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setChildPlatform('Acme')
      .build();

    expect(payment.childPlatform!.logoUrl).toBeUndefined();
    expect(payment.childPlatform!.logoLightUrl).toBeUndefined();
  });

  test('setChildPlatform_withUrls_setsUrls', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setChildPlatform('Acme', 'https://example.com/logo.png', 'https://example.com/logo-light.png')
      .build();

    expect(payment.childPlatform!.logoUrl).toBe('https://example.com/logo.png');
    expect(payment.childPlatform!.logoLightUrl).toBe('https://example.com/logo-light.png');
  });

  test('setChildPlatform_returnsBuilder', () => {
    const builder = new PaymentBuilder().addDestination(BitcoinAddress);
    const result = builder.setChildPlatform('Acme');

    expect(result).toBe(builder);
  });

  test('setChildPlatform_serializesToApi', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .setChildPlatform('Acme', 'https://example.com/logo.png')
      .build();

    const api = paymentToApi(payment);
    const cp = api['child_platform'] as Record<string, unknown>;

    expect(cp['name']).toBe('Acme');
    expect(cp['logo_url']).toBe('https://example.com/logo.png');
    expect(cp['logo_light_url']).toBeUndefined();
  });

  test('noChildPlatform_omittedFromApi', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress)
      .build();

    const api = paymentToApi(payment);

    expect(api['child_platform']).toBeUndefined();
  });
});
