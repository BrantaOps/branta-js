import { describe, expect, test } from '@jest/globals';

import * as Branta from '../src/index.js';
import { DestinationType } from '../src/index.js';

describe('publicApi', () => {
  test('exports_consumerSurface_forPostAndVerify', () => {
    expect(Branta.BrantaService).toBeDefined();
    expect(Branta.PaymentBuilder).toBeDefined();
    expect(Branta.DestinationType).toBeDefined();
    expect(Branta.VerifyStatus).toBeDefined();
    expect(Branta.BrantaEnvironment).toBeDefined();
    expect(Branta.BrantaPaymentException).toBeDefined();
    expect(Branta.createNobleCryptoProvider).toBeDefined();
  });

  test('destinationType_includesMultiRailStables', () => {
    expect(DestinationType.UsdtEthereum).toBe('usdt_ethereum');
    expect(DestinationType.UsdcSolana).toBe('usdc_solana');
    expect(DestinationType.UsdtTon).toBe('usdt_ton');
    expect(Object.values(DestinationType)).not.toContain('usdc_ton');
  });

  test('doesNotExportRailFamilyInternals', () => {
    const exported = Branta as Record<string, unknown>;
    for (const name of [
      'POLYGON_EVM_DESTINATION_TYPES',
      'ETHEREUM_EVM_DESTINATION_TYPES',
      'BSC_EVM_DESTINATION_TYPES',
      'TRON_DESTINATION_TYPES',
      'TON_DESTINATION_TYPES',
      'SOLANA_DESTINATION_TYPES',
      'SECRET_KEY_URI_FAMILIES',
      'isPolygonEvmDestinationType',
      'isSecretKeyAddressType',
    ]) {
      expect(exported).not.toHaveProperty(name);
    }
  });
});
