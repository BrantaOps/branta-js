export const DestinationType = {
  BitcoinAddress: 'bitcoin_address',
  Bolt11: 'bolt11',
  ArkAddress: 'ark_address',
  SilentPayment: 'silent_payment',
  UsdtPolygon: 'usdt_polygon',
} as const;

export type DestinationType = (typeof DestinationType)[keyof typeof DestinationType];

/** Address rails encrypted with a random branta_secret (not a derived key). */
export const isSecretKeyAddressType = (type: DestinationType): boolean =>
  type === DestinationType.BitcoinAddress || type === DestinationType.UsdtPolygon;
