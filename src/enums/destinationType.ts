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
 * Polygon EVM secret-key rails. `pol:` verify binds any member of this family
 * (match-if-any).
 */
export const POLYGON_EVM_DESTINATION_TYPES: readonly DestinationType[] = [
  DestinationType.UsdtPolygon,
  DestinationType.UsdcPolygon,
];

/** Type stamped on parsed `pol:` URIs. `verify` expands this to the full family. */
export const POLYGON_EVM_SCHEME_TYPE: DestinationType = POLYGON_EVM_DESTINATION_TYPES[0]!;

export const isPolygonEvmDestinationType = (type: DestinationType): boolean =>
  (POLYGON_EVM_DESTINATION_TYPES as readonly DestinationType[]).includes(type);

/** Address rails encrypted with a random branta_secret (not a derived key). */
export const isSecretKeyAddressType = (type: DestinationType): boolean =>
  type === DestinationType.BitcoinAddress || isPolygonEvmDestinationType(type);

/**
 * Secret-key destination types a QR of this typed rail may bind.
 * A `pol:` stamp (`POLYGON_EVM_SCHEME_TYPE` or any family member) expands to the
 * whole Polygon EVM family.
 */
export const secretKeyTypesForQrDestinationType = (
  type: DestinationType,
): readonly DestinationType[] => {
  if (isPolygonEvmDestinationType(type)) return POLYGON_EVM_DESTINATION_TYPES;
  return [type];
};
