import { describe, expect, test } from '@jest/globals';

import { DestinationType } from '../../../src/enums/destinationType.js';
import { PaymentBuilder } from '../../../src/v2/classes/paymentBuilder.js';
import { destinationToApi } from '../../../src/v2/services/serialization.js';

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
});
