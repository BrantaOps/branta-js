import { describe, expect, test } from '@jest/globals';

import { DestinationType } from '../../../src/enums/destinationType.js';
import { PaymentBuilder } from '../../../src/v2/classes/paymentBuilder.js';
import { destinationToApi } from '../../../src/v2/services/serialization.js';

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
    [DestinationType.Bolt12, 'bolt12'],
    [DestinationType.LnUrl, 'ln_url'],
    [DestinationType.TetherAddress, 'tether_address'],
    [DestinationType.LnAddress, 'ln_address'],
    [DestinationType.ArkAddress, 'ark_address'],
  ])('destinationType_serializesToCorrectJsonString (%s)', (type, expected) => {
    const destination = { value: 'addr', type } as const;
    const apiObject = destinationToApi(destination);
    const json = JSON.stringify(apiObject);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed['type']).toBe(expected);
  });

  test('destinationType_undefinedOmittedFromJson', () => {
    const destination = { value: 'addr' };
    const apiObject = destinationToApi(destination);
    const json = JSON.stringify(apiObject);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed['type']).toBeUndefined();
  });

  test('setZk_marksLastDestinationAsZkAndAssignsZkId', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
      .setZk()
      .build();

    expect(payment.destinations[0]!.isZk).toBe(true);
    expect(payment.destinations[0]!.zkId).toBeDefined();
    expect(payment.destinations[0]!.zkId!.length).toBeGreaterThan(0);
  });

  test('setZk_onlyAppliesToLastDestination', () => {
    const payment = new PaymentBuilder()
      .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
      .addDestination(Bolt11Invoice, DestinationType.Bolt11)
      .setZk()
      .build();

    expect(payment.destinations[0]!.isZk).toBe(false);
    expect(payment.destinations[1]!.isZk).toBe(true);
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
});
