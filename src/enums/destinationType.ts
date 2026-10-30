export const DestinationType = {
  BitcoinAddress: 'bitcoin_address',
  Bolt11: 'bolt11',
  ArkAddress: 'ark_address',
  SilentPayment: 'silent_payment',
} as const;

export type DestinationType = (typeof DestinationType)[keyof typeof DestinationType];
