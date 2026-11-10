export const DestinationType = {
  BitcoinAddress: 'bitcoin_address',
  Bolt11: 'bolt11',
  ArkAddress: 'ark_address',
  SilentPayment: 'silent_payment',
  UsdtPolygon: 'usdt_polygon',
  UsdcPolygon: 'usdc_polygon',
} as const;

export type DestinationType = (typeof DestinationType)[keyof typeof DestinationType];

/**
 * Polygon EVM secret-key rails. A `pol:` URI maps to this family for verify
 * (match-if-any). Token is still the destination type on the payment.
 */
export const POLYGON_EVM_DESTINATION_TYPES: readonly DestinationType[] = [
  DestinationType.UsdtPolygon,
  DestinationType.UsdcPolygon,
];

export const isPolygonEvmDestinationType = (type: DestinationType): boolean =>
  (POLYGON_EVM_DESTINATION_TYPES as readonly DestinationType[]).includes(type);

/** Address rails encrypted with a random branta_secret (not a derived key). */
export const isSecretKeyAddressType = (type: DestinationType): boolean =>
  type === DestinationType.BitcoinAddress || isPolygonEvmDestinationType(type);
