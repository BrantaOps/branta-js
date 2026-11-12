import {
  DestinationType,
  POLYGON_EVM_DESTINATION_TYPES,
  ETHEREUM_EVM_DESTINATION_TYPES,
  BSC_EVM_DESTINATION_TYPES,
  TRON_DESTINATION_TYPES,
  TON_DESTINATION_TYPES,
  SOLANA_DESTINATION_TYPES,
  SECRET_KEY_URI_FAMILIES,
  isPolygonEvmDestinationType,
  isSecretKeyAddressType,
} from '../../src/enums/destinationType.js';

describe('destinationType', () => {
  test('polygonEvmFamily_includesUsdtAndUsdc', () => {
    expect(POLYGON_EVM_DESTINATION_TYPES).toEqual([
      DestinationType.UsdtPolygon,
      DestinationType.UsdcPolygon,
    ]);
    expect(isPolygonEvmDestinationType(DestinationType.UsdtPolygon)).toBe(true);
    expect(isPolygonEvmDestinationType(DestinationType.UsdcPolygon)).toBe(true);
    expect(isPolygonEvmDestinationType(DestinationType.BitcoinAddress)).toBe(false);
  });

  test('secretKeyUriFamilies_mapSchemesToRails', () => {
    expect(SECRET_KEY_URI_FAMILIES).toEqual({
      pol: POLYGON_EVM_DESTINATION_TYPES,
      eth: ETHEREUM_EVM_DESTINATION_TYPES,
      bsc: BSC_EVM_DESTINATION_TYPES,
      tron: TRON_DESTINATION_TYPES,
      ton: TON_DESTINATION_TYPES,
      sol: SOLANA_DESTINATION_TYPES,
    });
    expect(TON_DESTINATION_TYPES).toEqual([DestinationType.UsdtTon]);
    // usdc_ton deferred — must not appear in the public enum/family.
    expect(Object.values(DestinationType)).not.toContain('usdc_ton');
  });

  test('isSecretKeyAddressType_includesBitcoinAndAllStableFamilies', () => {
    expect(isSecretKeyAddressType(DestinationType.BitcoinAddress)).toBe(true);
    for (const family of Object.values(SECRET_KEY_URI_FAMILIES)) {
      for (const type of family) {
        expect(isSecretKeyAddressType(type)).toBe(true);
      }
    }
    expect(isSecretKeyAddressType(DestinationType.Bolt11)).toBe(false);
    expect(isSecretKeyAddressType(DestinationType.ArkAddress)).toBe(false);
  });
});
