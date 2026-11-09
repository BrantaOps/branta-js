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

// Live addPayment → verify against staging. Needs BRANTA_API_KEY (write).
// Skipped unless BRANTA_RUN_INTEGRATION=1 — local `npm test` and PR CI must not hit Guardrail.
const describeLiveWrite =
  process.env.BRANTA_RUN_INTEGRATION === '1' && apiKey !== undefined && apiKey !== ''
    ? describe
    : describe.skip;

describeLiveWrite('Staging usdc_polygon round-trip', () => {
  const service = new BrantaService({
    environment: BrantaEnvironment.Staging,
    apiKey,
    fetchImpl: fetchLive,
  });

  const address = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
  const swapped = '0x1111111111111111111111111111111111111111';

  const polUri = (recipient: string, encrypted: string, secret: string) =>
    `pol:${recipient}?value=50&user=send&currency=USD&branta_id=${encodeURIComponent(encrypted)}&branta_secret=${encodeURIComponent(secret)}`;

  test('addPayment then verify match, case-insensitive, tampered, and bare unknown', async () => {
    const payment = service
      .createPaymentBuilder()
      .addDestination(address, DestinationType.UsdcPolygon)
      .setTtl(120)
      .build();

    const { secret, payment: created } = await service.addPayment(payment);
    const encrypted = created.destinations[0]!.value;

    expect(created.destinations[0]!.type).toBe(DestinationType.UsdcPolygon);

    const match = await service.verify(polUri(address, encrypted, secret));
    expect(match.status).toBe(VerifyStatus.Match);
    if (match.status !== VerifyStatus.Match) throw new Error('expected match');
    expect(match.payments[0]!.destinations[0]!.type).toBe(DestinationType.UsdcPolygon);
    expect(match.payments[0]!.destinations[0]!.value.toLowerCase()).toBe(address.toLowerCase());

    const lower = await service.verify(polUri(address.toLowerCase(), encrypted, secret));
    expect(lower.status).toBe(VerifyStatus.Match);

    const tampered = await service.verify(polUri(swapped, encrypted, secret));
    expect(tampered.status).toBe(VerifyStatus.Tampered);

    const bare = await service.verify(address);
    expect(bare.status).toBe(VerifyStatus.Unknown);

    const polWithoutBranta = await service.verify(`pol:${address}?value=50&currency=USD`);
    expect(polWithoutBranta.status).toBe(VerifyStatus.Unknown);
  }, 30000);
});
