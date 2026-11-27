import { describe, expect, test } from '@jest/globals';

import { BrantaEnvironment } from '../../src/enums/brantaEnvironment.js';
import { DestinationType } from '../../src/enums/destinationType.js';
import { VerifyStatus } from '../../src/models/verifyResult.js';
import { BrantaService } from '../../src/services/brantaService.js';

const apiKey = process.env.BRANTA_API_KEY;
const integrationMetricsToken = process.env.BRANTA_INTEGRATION_METRICS_TOKEN;

const fetchLive: typeof fetch = (input, init) => {
  if (integrationMetricsToken === undefined || integrationMetricsToken === '') {
    return fetch(input, init);
  }
  const headers = new Headers(init?.headers);
  headers.set('X-Branta-Integration-Token', integrationMetricsToken);
  return fetch(input, { ...init, headers });
};

const describeLiveWrite =
  process.env.BRANTA_RUN_INTEGRATION === '1' && apiKey !== undefined && apiKey !== ''
    ? describe
    : describe.skip;

const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

type SecretKeyRail = {
  kind: 'secret';
  type: DestinationType;
  address: string;
  swapped: string;
  /** EVM addresses fold case for match. */
  caseFold?: boolean;
  /** Set for EIP-681 EVM rails. Bitcoin leaves it unset. */
  eip681?: { chainId: number; contract: string };
  /** Set for Solana Pay rails. Base58 is case-sensitive. */
  solana?: { mint: string };
};

type DerivedKeyRail = {
  kind: 'derived';
  type: DestinationType;
  /** Fresh value each run — derived-key ciphertext is deterministic. */
  value: () => string;
};

const secretKeyRails: SecretKeyRail[] = [
  {
    kind: 'secret',
    type: DestinationType.BitcoinAddress,
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    swapped: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtPolygon,
    address: '0x278297528c32eCa01295B0d2135984d3442ec963',
    swapped: '0x1111111111111111111111111111111111111111',
    caseFold: true,
    eip681: { chainId: 137, contract: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcPolygon,
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    swapped: '0x2222222222222222222222222222222222222222',
    caseFold: true,
    eip681: { chainId: 137, contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtEthereum,
    address: '0xBF5550253939187432Ef4dccE8089765d3DCb47f',
    swapped: '0x3333333333333333333333333333333333333333',
    caseFold: true,
    eip681: { chainId: 1, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcEthereum,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    swapped: '0x4444444444444444444444444444444444444444',
    caseFold: true,
    eip681: { chainId: 1, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtBsc,
    address: '0x55d398326f99059fF775485246999027B3197955',
    swapped: '0x5555555555555555555555555555555555555555',
    caseFold: true,
    eip681: { chainId: 56, contract: '0x55d398326f99059ff775485246999027b3197955' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcBsc,
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    swapped: '0x6666666666666666666666666666666666666666',
    caseFold: true,
    eip681: { chainId: 56, contract: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcBase,
    address: '0x1111111111111111111111111111111111111112',
    swapped: '0x1111111111111111111111111111111111111113',
    caseFold: true,
    eip681: { chainId: 8453, contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtBase,
    address: '0x1111111111111111111111111111111111111114',
    swapped: '0x1111111111111111111111111111111111111115',
    caseFold: true,
    eip681: { chainId: 8453, contract: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcArbitrum,
    address: '0x1111111111111111111111111111111111111116',
    swapped: '0x1111111111111111111111111111111111111117',
    caseFold: true,
    eip681: { chainId: 42161, contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtArbitrum,
    address: '0x1111111111111111111111111111111111111118',
    swapped: '0x1111111111111111111111111111111111111119',
    caseFold: true,
    eip681: { chainId: 42161, contract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtSolana,
    address: 'DcMXDhhFJnoutz8oisA9XKUZRAarDVDqtpGjAcjxcQYL',
    swapped: 'H7yyW3Sf7DMRwpovc3DaAsJrkrZ7qxthwdxi45V1EgvA',
    solana: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcSolana,
    address: 'H7yyW3Sf7DMRwpovc3DaAsJrkrZ7qxthwdxi45V1EgvA',
    swapped: 'DcMXDhhFJnoutz8oisA9XKUZRAarDVDqtpGjAcjxcQYL',
    solana: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  },
];

const derivedKeyRails: DerivedKeyRail[] = [
  {
    kind: 'derived',
    type: DestinationType.Bolt11,
    value: () => `lnbc${uniq()}n1ptest`,
  },
  {
    kind: 'derived',
    type: DestinationType.ArkAddress,
    value: () => `ark1qqroundtrip${uniq()}`,
  },
  {
    kind: 'derived',
    type: DestinationType.SilentPayment,
    value: () => `sp1qqroundtrip${uniq()}`,
  },
];

const secretKeyUri = (
  rail: Pick<SecretKeyRail, 'eip681' | 'solana'>,
  recipient: string,
  encrypted: string,
  secret: string,
) => {
  if (rail.eip681 !== undefined) {
    return `ethereum:${rail.eip681.contract}@${rail.eip681.chainId}/transfer?address=${recipient}&uint256=1000000&branta_id=${encodeURIComponent(encrypted)}&branta_secret=${encodeURIComponent(secret)}`;
  }
  if (rail.solana !== undefined) {
    return `solana:${recipient}?spl-token=${rail.solana.mint}&amount=1&branta_id=${encodeURIComponent(encrypted)}&branta_secret=${encodeURIComponent(secret)}`;
  }
  return `bitcoin:${recipient}?branta_id=${encodeURIComponent(encrypted)}&branta_secret=${encodeURIComponent(secret)}`;
};

const uriWithoutBranta = (rail: SecretKeyRail) => {
  if (rail.eip681 !== undefined) {
    return `ethereum:${rail.eip681.contract}@${rail.eip681.chainId}/transfer?address=${rail.address}&uint256=1000000`;
  }
  if (rail.solana !== undefined) {
    return `solana:${rail.address}?spl-token=${rail.solana.mint}&amount=1`;
  }
  return `bitcoin:${rail.address}`;
};

describeLiveWrite('Staging multi-rail SDK round-trips', () => {
  const service = new BrantaService({
    environment: BrantaEnvironment.Staging,
    apiKey,
    fetchImpl: fetchLive,
  });

  test.each(secretKeyRails)(
    'secret-key $type: match, caseFold, tampered, bare unknown, uri-without-branta unknown',
    async (rail) => {
      const payment = service
        .createPaymentBuilder()
        .addDestination(rail.address, rail.type)
        .setTtl(180)
        .build();

      const { secret, payment: created } = await service.addPayment(payment);
      const encrypted = created.destinations[0]!.value;

      expect(created.destinations[0]!.type).toBe(rail.type);
      expect(encrypted).not.toBe(rail.address);

      const match = await service.verify(secretKeyUri(rail, rail.address, encrypted, secret));
      expect(match.status).toBe(VerifyStatus.Match);
      if (match.status !== VerifyStatus.Match) throw new Error(`expected match for ${rail.type}`);
      expect(match.matchedDestinations).toHaveLength(1);
      expect(match.matchedDestinations[0]!.type).toBe(rail.type);
      if (rail.caseFold) {
        expect(match.matchedDestinations[0]!.value.toLowerCase()).toBe(rail.address.toLowerCase());
      } else {
        expect(match.matchedDestinations[0]!.value).toBe(rail.address);
      }

      if (rail.caseFold) {
        const folded = await service.verify(
          secretKeyUri(rail, rail.address.toLowerCase(), encrypted, secret),
        );
        expect(folded.status).toBe(VerifyStatus.Match);
      }

      const tampered = await service.verify(secretKeyUri(rail, rail.swapped, encrypted, secret));
      expect(tampered.status).toBe(VerifyStatus.Tampered);

      const bare = await service.verify(rail.address);
      expect(bare.status).toBe(VerifyStatus.Unknown);

      const noBranta = await service.verify(uriWithoutBranta(rail));
      expect(noBranta.status).toBe(VerifyStatus.Unknown);
    },
    45000,
  );

  test.each([
    { type: DestinationType.UsdtTron, address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', scheme: 'tron' },
    { type: DestinationType.UsdtTon, address: 'EQDtFpEwcFAEcRe5mLVh2N6C0y-_tur3BYOM93pEZPw390by', scheme: 'ton' },
  ])(
    'post-only $type: addPayment encrypts and $scheme does not verify',
    async (rail) => {
      const payment = service.createPaymentBuilder().addDestination(rail.address, rail.type).setTtl(180).build();
      const { secret, payment: created } = await service.addPayment(payment);
      const encrypted = created.destinations[0]!.value;

      expect(created.destinations[0]!.type).toBe(rail.type);
      expect(encrypted).not.toBe(rail.address);

      const uri = `${rail.scheme}:${rail.address}?branta_id=${encodeURIComponent(encrypted)}&branta_secret=${encodeURIComponent(secret)}`;
      const result = await service.verify(uri);
      expect(result.status).toBe(VerifyStatus.Unknown);
    },
    45000,
  );

  test.each(derivedKeyRails)(
    'derived-key $type: match, wrong value unknown, bare-prefix style',
    async (rail) => {
      const value = rail.value();
      const payment = service.createPaymentBuilder().addDestination(value, rail.type).setTtl(180).build();

      const { payment: created } = await service.addPayment(payment);
      expect(created.destinations[0]!.type).toBe(rail.type);
      expect(created.destinations[0]!.value).not.toBe(value);

      const match = await service.verify(value);
      expect(match.status).toBe(VerifyStatus.Match);
      if (match.status !== VerifyStatus.Match) throw new Error(`expected match for ${rail.type}`);
      expect(match.matchedDestinations[0]!.type).toBe(rail.type);
      expect(match.matchedDestinations[0]!.value.toLowerCase()).toBe(value.toLowerCase());

      // Different payable value → different derived lookup → unknown (not tampered).
      const other = rail.value();
      const miss = await service.verify(other);
      expect(miss.status).toBe(VerifyStatus.Unknown);
    },
    45000,
  );

  test('cross-chain: an Ethereum USDT URI must not bind a Polygon-only payment', async () => {
    const address = '0x278297528c32eCa01295B0d2135984d3442ec963';
    const payment = service
      .createPaymentBuilder()
      .addDestination(address, DestinationType.UsdtPolygon)
      .setTtl(180)
      .build();

    const { secret, payment: created } = await service.addPayment(payment);
    const encrypted = created.destinations[0]!.value;

    const cross = await service.verify(
      secretKeyUri(
        { eip681: { chainId: 1, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' } },
        address,
        encrypted,
        secret,
      ),
    );
    expect(cross.status).toBe(VerifyStatus.Unknown);

    const correct = await service.verify(
      secretKeyUri(
        { eip681: { chainId: 137, contract: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' } },
        address,
        encrypted,
        secret,
      ),
    );
    expect(correct.status).toBe(VerifyStatus.Match);
  }, 45000);

  test('eip681: eth dual-token payment binds the scanned token only', async () => {
    const usdt = '0xBF5550253939187432Ef4dccE8089765d3DCb47f';
    const usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const payment = service
      .createPaymentBuilder()
      .addDestination(usdt, DestinationType.UsdtEthereum)
      .addDestination(usdc, DestinationType.UsdcEthereum)
      .setTtl(180)
      .build();

    const { secret, payment: created } = await service.addPayment(payment);
    // Same branta_id can be either ciphertext; use the USDT leg as lookup (first destination).
    const encryptedUsdt = created.destinations[0]!.value;

    const ethUsdt = { eip681: { chainId: 1, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' } };
    const ethUsdc = { eip681: { chainId: 1, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' } };
    const matchUsdt = await service.verify(secretKeyUri(ethUsdt, usdt, encryptedUsdt, secret));
    expect(matchUsdt.status).toBe(VerifyStatus.Match);
    if (matchUsdt.status !== VerifyStatus.Match) throw new Error('expected usdt match');
    expect(matchUsdt.matchedDestinations.map((d) => d.type)).toEqual([DestinationType.UsdtEthereum]);
    const usdcDest = matchUsdt.payments[0]!.destinations.find((d) => d.type === DestinationType.UsdcEthereum);
    expect(usdcDest?.isEncrypted).not.toBe(false);

    const matchUsdc = await service.verify(secretKeyUri(ethUsdc, usdc, encryptedUsdt, secret));
    expect(matchUsdc.status).toBe(VerifyStatus.Match);
    if (matchUsdc.status !== VerifyStatus.Match) throw new Error('expected usdc match');
    expect(matchUsdc.matchedDestinations.map((d) => d.type)).toEqual([DestinationType.UsdcEthereum]);

    const swapped = await service.verify(
      secretKeyUri(ethUsdt, '0x9999999999999999999999999999999999999999', encryptedUsdt, secret),
    );
    expect(swapped.status).toBe(VerifyStatus.Tampered);
  }, 45000);

  test('reject unknown type usdc_ton at addPayment', async () => {
    const payment = service
      .createPaymentBuilder()
      .addDestination('EQDtFpEwcFAEcRe5mLVh2N6C0y-_tur3BYOM93pEZPw390by', 'usdc_ton' as DestinationType)
      .setTtl(60)
      .build();

    await expect(service.addPayment(payment)).rejects.toThrow(/cannot be encrypted|usdc_ton/i);
  }, 30000);
});
