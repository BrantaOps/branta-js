import {
  DestinationType,
  POLYGON_EVM_DESTINATION_TYPES,
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

  test('isSecretKeyAddressType_includesBitcoinAndPolygonFamily', () => {
    expect(isSecretKeyAddressType(DestinationType.BitcoinAddress)).toBe(true);
    expect(isSecretKeyAddressType(DestinationType.UsdtPolygon)).toBe(true);
    expect(isSecretKeyAddressType(DestinationType.UsdcPolygon)).toBe(true);
    expect(isSecretKeyAddressType(DestinationType.Bolt11)).toBe(false);
  });
});
