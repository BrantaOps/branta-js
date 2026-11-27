import {
  DestinationType,
  EVM_TOKEN_RAILS,
  evmTokenType,
  isSecretKeyAddressType,
  isSolanaType,
  SOLANA_TOKEN_RAILS,
  solanaTokenType,
} from '../../src/enums/destinationType.js';

describe('destinationType', () => {
  test('evmTokenType_selectsOneRailFromChainAndContract', () => {
    expect(EVM_TOKEN_RAILS).toHaveLength(10);
    expect(evmTokenType(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBe(DestinationType.UsdcEthereum);
    expect(evmTokenType(1, '0xdac17f958d2ee523a2206206994597c13d831ec7')).toBe(DestinationType.UsdtEthereum);
    expect(evmTokenType(137, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359')).toBe(DestinationType.UsdcPolygon);
    expect(evmTokenType(137, '0xc2132d05d31c914a87c6611c10748aeb04b58e8f')).toBe(DestinationType.UsdtPolygon);
    expect(evmTokenType(8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(DestinationType.UsdcBase);
    expect(evmTokenType(8453, '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2')).toBe(DestinationType.UsdtBase);
    expect(evmTokenType(42161, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831')).toBe(DestinationType.UsdcArbitrum);
    expect(evmTokenType(42161, '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9')).toBe(DestinationType.UsdtArbitrum);
    expect(evmTokenType(56, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d')).toBe(DestinationType.UsdcBsc);
    expect(evmTokenType(56, '0x55d398326f99059fF775485246999027B3197955')).toBe(DestinationType.UsdtBsc);
    expect(evmTokenType(1, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBeUndefined();
    expect(evmTokenType(8453, '0x0000000000000000000000000000000000000000')).toBeUndefined();
    expect(Object.values(DestinationType)).not.toContain('usdc_ton');
  });

  test('solanaTokenType_selectsOneRailFromMint', () => {
    expect(SOLANA_TOKEN_RAILS).toHaveLength(2);
    expect(solanaTokenType('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(DestinationType.UsdcSolana);
    expect(solanaTokenType('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')).toBe(DestinationType.UsdtSolana);
    expect(solanaTokenType('epjfwdd5aufqsseqm2qn1xzybapc8g4wegggkzwytdt1v')).toBeUndefined();
    expect(solanaTokenType('')).toBeUndefined();
    expect(isSolanaType(DestinationType.UsdcSolana)).toBe(true);
    expect(isSolanaType(DestinationType.UsdtSolana)).toBe(true);
    expect(isSolanaType(DestinationType.UsdtBase)).toBe(false);
    expect(isSolanaType(DestinationType.BitcoinAddress)).toBe(false);
  });

  test('isSecretKeyAddressType_includesBitcoinEvmAndPostOnlyStables', () => {
    expect(isSecretKeyAddressType(DestinationType.BitcoinAddress)).toBe(true);
    for (const rail of EVM_TOKEN_RAILS) {
      expect(isSecretKeyAddressType(rail.type)).toBe(true);
    }
    for (const rail of SOLANA_TOKEN_RAILS) {
      expect(isSecretKeyAddressType(rail.type)).toBe(true);
    }
    for (const type of [DestinationType.UsdtTron, DestinationType.UsdtTon]) {
      expect(isSecretKeyAddressType(type)).toBe(true);
    }
    expect(isSecretKeyAddressType(DestinationType.Bolt11)).toBe(false);
    expect(isSecretKeyAddressType(DestinationType.ArkAddress)).toBe(false);
    expect(isSecretKeyAddressType(DestinationType.SilentPayment)).toBe(false);
  });
});
