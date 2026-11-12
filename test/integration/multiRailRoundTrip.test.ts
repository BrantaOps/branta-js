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
  scheme: string;
  address: string;
  swapped: string;
  /** EVM addresses fold case for match. */
  caseFold?: boolean;
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
    scheme: 'bitcoin',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    swapped: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtPolygon,
    scheme: 'pol',
    address: '0x278297528c32eCa01295B0d2135984d3442ec963',
    swapped: '0x1111111111111111111111111111111111111111',
    caseFold: true,
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcPolygon,
    scheme: 'pol',
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    swapped: '0x2222222222222222222222222222222222222222',
    caseFold: true,
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtEthereum,
    scheme: 'eth',
    address: '0xBF5550253939187432Ef4dccE8089765d3DCb47f',
    swapped: '0x3333333333333333333333333333333333333333',
    caseFold: true,
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcEthereum,
    scheme: 'eth',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    swapped: '0x4444444444444444444444444444444444444444',
    caseFold: true,
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtBsc,
    scheme: 'bsc',
    address: '0x55d398326f99059fF775485246999027B3197955',
    swapped: '0x5555555555555555555555555555555555555555',
    caseFold: true,
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcBsc,
    scheme: 'bsc',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    swapped: '0x6666666666666666666666666666666666666666',
    caseFold: true,
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtTron,
    scheme: 'tron',
    address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
    swapped: 'TXyZ1111111111111111111111111111111',
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtTon,
    scheme: 'ton',
    address: 'EQDtFpEwcFAEcRe5mLVh2N6C0y-_tur3BYOM93pEZPw390by',
    swapped: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
  },
  {
    kind: 'secret',
    type: DestinationType.UsdtSolana,
    scheme: 'sol',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    swapped: '11111111111111111111111111111111',
  },
  {
    kind: 'secret',
    type: DestinationType.UsdcSolana,
    scheme: 'sol',
    address: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDofycyinf',
    swapped: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
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

const secretKeyUri = (scheme: string, recipient: string, encrypted: string, secret: string) =>
  `${scheme}:${recipient}?branta_id=${encodeURIComponent(encrypted)}&branta_secret=${encodeURIComponent(secret)}`;

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

      const match = await service.verify(secretKeyUri(rail.scheme, rail.address, encrypted, secret));
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
          secretKeyUri(rail.scheme, rail.address.toLowerCase(), encrypted, secret),
        );
        expect(folded.status).toBe(VerifyStatus.Match);
      }

      const tampered = await service.verify(secretKeyUri(rail.scheme, rail.swapped, encrypted, secret));
      expect(tampered.status).toBe(VerifyStatus.Tampered);

      const bare = await service.verify(rail.address);
      expect(bare.status).toBe(VerifyStatus.Unknown);

      const noBranta = await service.verify(`${rail.scheme}:${rail.address}`);
      expect(noBranta.status).toBe(VerifyStatus.Unknown);
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

  test('cross-scheme: eth URI must not bind a polygon-only payment', async () => {
    const address = '0x278297528c32eCa01295B0d2135984d3442ec963';
    const payment = service
      .createPaymentBuilder()
      .addDestination(address, DestinationType.UsdtPolygon)
      .setTtl(180)
      .build();

    const { secret, payment: created } = await service.addPayment(payment);
    const encrypted = created.destinations[0]!.value;

    const cross = await service.verify(secretKeyUri('eth', address, encrypted, secret));
    expect(cross.status).toBe(VerifyStatus.Unknown);

    const correct = await service.verify(secretKeyUri('pol', address, encrypted, secret));
    expect(correct.status).toBe(VerifyStatus.Match);
  }, 45000);

  test('match-if-any: eth dual-token payment binds scanned rail only', async () => {
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

    const matchUsdt = await service.verify(secretKeyUri('eth', usdt, encryptedUsdt, secret));
    expect(matchUsdt.status).toBe(VerifyStatus.Match);
    if (matchUsdt.status !== VerifyStatus.Match) throw new Error('expected usdt match');
    expect(matchUsdt.matchedDestinations.map((d) => d.type)).toEqual([DestinationType.UsdtEthereum]);
    const usdcDest = matchUsdt.payments[0]!.destinations.find((d) => d.type === DestinationType.UsdcEthereum);
    expect(usdcDest?.isEncrypted).not.toBe(false);

    const matchUsdc = await service.verify(secretKeyUri('eth', usdc, encryptedUsdt, secret));
    expect(matchUsdc.status).toBe(VerifyStatus.Match);
    if (matchUsdc.status !== VerifyStatus.Match) throw new Error('expected usdc match');
    expect(matchUsdc.matchedDestinations.map((d) => d.type)).toEqual([DestinationType.UsdcEthereum]);

    const swapped = await service.verify(
      secretKeyUri('eth', '0x9999999999999999999999999999999999999999', encryptedUsdt, secret),
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
