export const DestinationType = {
  BitcoinAddress: 'bitcoin_address',
  Bolt11: 'bolt11',
  ArkAddress: 'ark_address',
  SilentPayment: 'silent_payment',
  UsdtPolygon: 'usdt_polygon',
  UsdcPolygon: 'usdc_polygon',
  UsdtEthereum: 'usdt_ethereum',
  UsdcEthereum: 'usdc_ethereum',
  UsdtBsc: 'usdt_bsc',
  UsdcBsc: 'usdc_bsc',
  UsdtTron: 'usdt_tron',
  UsdtTon: 'usdt_ton',
  UsdcTon: 'usdc_ton',
  UsdtSolana: 'usdt_solana',
  UsdcSolana: 'usdc_solana',
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

export const ETHEREUM_EVM_DESTINATION_TYPES: readonly DestinationType[] = [
  DestinationType.UsdtEthereum,
  DestinationType.UsdcEthereum,
];

export const BSC_EVM_DESTINATION_TYPES: readonly DestinationType[] = [
  DestinationType.UsdtBsc,
  DestinationType.UsdcBsc,
];

export const TRON_DESTINATION_TYPES: readonly DestinationType[] = [DestinationType.UsdtTron];

export const TON_DESTINATION_TYPES: readonly DestinationType[] = [
  DestinationType.UsdtTon,
  DestinationType.UsdcTon,
];

export const SOLANA_DESTINATION_TYPES: readonly DestinationType[] = [
  DestinationType.UsdtSolana,
  DestinationType.UsdcSolana,
];

/** URI scheme → secret-key destination family for verify (match-if-any). */
export const SECRET_KEY_URI_FAMILIES: Readonly<Record<string, readonly DestinationType[]>> = {
  pol: POLYGON_EVM_DESTINATION_TYPES,
  eth: ETHEREUM_EVM_DESTINATION_TYPES,
  bsc: BSC_EVM_DESTINATION_TYPES,
  tron: TRON_DESTINATION_TYPES,
  ton: TON_DESTINATION_TYPES,
  sol: SOLANA_DESTINATION_TYPES,
};

export const isPolygonEvmDestinationType = (type: DestinationType): boolean =>
  (POLYGON_EVM_DESTINATION_TYPES as readonly DestinationType[]).includes(type);

export const isSecretKeyAddressType = (type: DestinationType): boolean =>
  type === DestinationType.BitcoinAddress ||
  Object.values(SECRET_KEY_URI_FAMILIES).some((family) =>
    (family as readonly DestinationType[]).includes(type),
  );
