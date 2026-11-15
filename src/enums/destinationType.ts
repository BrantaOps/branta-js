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
  UsdtSolana: 'usdt_solana',
  UsdcSolana: 'usdc_solana',
  UsdtBase: 'usdt_base',
  UsdcBase: 'usdc_base',
  UsdtArbitrum: 'usdt_arbitrum',
  UsdcArbitrum: 'usdc_arbitrum',
} as const;

export type DestinationType = (typeof DestinationType)[keyof typeof DestinationType];

/**
 * EIP-681 `ethereum:<contract>@<chainId>/transfer` rails.
 * Chain id plus token contract select one destination type.
 * Contracts are lowercase so lookup is case-insensitive.
 */
export const EVM_TOKEN_RAILS: readonly {
  chainId: number;
  contract: string;
  type: DestinationType;
}[] = [
  { chainId: 1, contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', type: DestinationType.UsdcEthereum },
  { chainId: 1, contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', type: DestinationType.UsdtEthereum },
  { chainId: 137, contract: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', type: DestinationType.UsdcPolygon },
  { chainId: 137, contract: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', type: DestinationType.UsdtPolygon },
  { chainId: 8453, contract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', type: DestinationType.UsdcBase },
  { chainId: 8453, contract: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', type: DestinationType.UsdtBase },
  { chainId: 42161, contract: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', type: DestinationType.UsdcArbitrum },
  { chainId: 42161, contract: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', type: DestinationType.UsdtArbitrum },
  { chainId: 56, contract: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', type: DestinationType.UsdcBsc },
  { chainId: 56, contract: '0x55d398326f99059ff775485246999027b3197955', type: DestinationType.UsdtBsc },
];

export const evmTokenType = (chainId: number, contract: string): DestinationType | undefined => {
  const needle = contract.toLowerCase();
  return EVM_TOKEN_RAILS.find((rail) => rail.chainId === chainId && rail.contract === needle)?.type;
};

/**
 * Address rails `addPayment` encrypts with one UUID.
 * Tron, TON, and Solana stay here so POST still works. They have no verify URI.
 */
const UUID_SECRET_DESTINATION_TYPES: ReadonlySet<DestinationType> = new Set([
  DestinationType.BitcoinAddress,
  ...EVM_TOKEN_RAILS.map((rail) => rail.type),
  DestinationType.UsdtTron,
  DestinationType.UsdtTon,
  DestinationType.UsdtSolana,
  DestinationType.UsdcSolana,
]);

export const isSecretKeyAddressType = (type: DestinationType): boolean =>
  UUID_SECRET_DESTINATION_TYPES.has(type);
