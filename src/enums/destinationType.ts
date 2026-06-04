export const DestinationType = {
  BitcoinAddress: 'bitcoin_address',
  Bolt11: 'bolt11',
  Bolt12: 'bolt12',
  LnUrl: 'ln_url',
  TetherAddress: 'tether_address',
  LnAddress: 'ln_address',
  ArkAddress: 'ark_address',
  SilentPayment: 'silent_payment',
} as const;

export type DestinationType = (typeof DestinationType)[keyof typeof DestinationType];
