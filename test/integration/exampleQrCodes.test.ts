import { describe, expect, test } from '@jest/globals';

import { BrantaEnvironment } from '../../src/enums/brantaEnvironment.js';
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

const makeService = (environment: BrantaEnvironment) =>
  new BrantaService({ environment, apiKey: apiKey, fetchImpl: fetchLive });

// Live lookups of the published example QR codes. Skipped unless
// BRANTA_RUN_INTEGRATION=1 — local `npm test` and PR CI must not hit Guardrail.
const describeLive = process.env.BRANTA_RUN_INTEGRATION === '1' ? describe : describe.skip;

describeLive('Production', () => {
  const service = makeService(BrantaEnvironment.Production);

  const onChain = 'bitcoin:bc1qu3k6geqdjncaarsu2vq56tt8php5vsug9kasmq';
  const lightning =
    'lightning:lnbc17760n1p4r4tqupp5yuapqmxldkc8smuwa6t8shkdg9gezulu0vc7htepfsvweph8kqfsdphgfexzmn5vysygetkv4kx7ur9wgsyc6t8dp6xu6twvusy27rpd4cxcegcqzzsxq97zvuqsp53564rg6w4xjqy7jamcfqxyy83a0j8nzfs0wpevs37t5ln49q6hrs9qxpqysgq47hpqmv34g25le8sceq9jdvul2nz7ucyu0vucv56nlfe40x7n3jsu8duxjrn6tgvdspt872crk9zeatafznm9c57m039z7wyx6g3njsqkchkdh';
  const brantaOnChain =
    'bitcoin:bc1q6745z6cy3u0k9nprurh3x804c4r7u3u8vxca2n?branta_id=Qy4e3KJ9yRs%2BVWq59aSTC6o%2F6vbCnw0v7ZutEs1mxjpGM2i5DgVVl7G0TwFO9CqQ1ws3zNqogQu%2B2%2Bx3U%2BQ8%2FSZtwgjezw%3D%3D&branta_secret=f9b0fd20-b402-4cd2-b68f-3ae3db52dbf5';
  const brantaLightning =
    'lightning:lnbc17760n1p4r4flypp5k56kq3v2935rl3glkqu9vngfueud2zj87hjcff3t0kn0yrge0pfqdzjgfexzmn5vysz6gzyv4mx2mr0wpjhygzvd9nksarwd9hxwgz6v4ex7gztdehhwmr9v3nk2gz90psk6urvv5cqzzsxq97zvuqsp5hut3t0l0s5mvp9yr06v4253kqtf452z6c65s6g9sga445hc03v6s9qxpqysgqqm430zkk9uymjgvllr3aha88hc6q59etxasfqswn8r8pfm3dstlpp46azv906xtcj3wzprxup5fxn65a5wymt7zzq9sw9qdzx8rgdhcpk80nrg';
  const brantaUnified =
    'bitcoin:bc1qu3k6geqdjncaarsu2vq56tt8php5vsug9kasmq?lightning=lnbc17760n1p4r4tqupp5yuapqmxldkc8smuwa6t8shkdg9gezulu0vc7htepfsvweph8kqfsdphgfexzmn5vysygetkv4kx7ur9wgsyc6t8dp6xu6twvusy27rpd4cxcegcqzzsxq97zvuqsp53564rg6w4xjqy7jamcfqxyy83a0j8nzfs0wpevs37t5ln49q6hrs9qxpqysgq47hpqmv34g25le8sceq9jdvul2nz7ucyu0vucv56nlfe40x7n3jsu8duxjrn6tgvdspt872crk9zeatafznm9c57m039z7wyx6g3njsqkchkdh&branta_id=%2BbcErHkjD6aDfvhegd1CPRgQQwes64aMIqPXCRBVKP88d982zJt7TUHTq%2B11O9ij9HFzXC%2BTvh%2ByFoECrvZKpv%2FVuGGLIA%3D%3D&branta_secret=c4ba0501-059e-459b-9b11-64d97f158291';
  const notFound = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  test('on-chain address returns empty', async () => {
    const result = await service.verify(onChain);
    expect(result.status).toBe(VerifyStatus.Unknown);
  }, 15000);

  test('lightning returns payment', async () => {
    const result = await service.verify(lightning);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('branta on-chain returns payment', async () => {
    const result = await service.verify(brantaOnChain);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('branta lightning returns payment', async () => {
    const result = await service.verify(brantaLightning);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('branta unified returns payment', async () => {
    const result = await service.verify(brantaUnified);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('not found returns empty', async () => {
    const result = await service.verify(notFound);
    expect(result.status).toBe(VerifyStatus.Unknown);
  }, 15000);
});

describeLive('Staging', () => {
  const service = makeService(BrantaEnvironment.Staging);

  const onChain = 'bitcoin:bc1qgw3dzmhnyvcswc9r0v0z0ajtp8ulm4nuyeahwr';
  const lightning =
    'lightning:lnbc25830n1p4quq9ppp5zszvpgxtu6uwyur6sf7rayc0meqprqlkv30xjzclh6nzm7gavd8sdzh2d6xzemfdenjqsnjv9h8gcfq95sygetkv4kx7ur9wgsyc6t8dp6xu6twvusy27rpd4cxcefq9pfhgct8d9hxw2gcqzzsxqzursp5fcfx5st7x8rgxra42j47hskmzkcz96mx84xcnvs9lpsmjyzqhw2q9qxpqysgq06lxdc93jjpuqsal9unlfct6wuv0v53yxa8kksl85g3qdw7qks7z9jkq39c6wgzar72luwd38sfj0klyqv0zgns4rq7nafnd8qeuudcqql7at4';
  const brantaOnChain =
    'bitcoin:bc1qgw3dzmhnyvcswc9r0v0z0ajtp8ulm4nuyeahwr?branta_id=6SpYCe23r79x0t8rNvmjWqhrg8hen4xz%2FYSXhNJ9HLSYrTRPnm%2BSwAuf6NOKobnwE%2B3MQBNkyTnCtIWpKKX2E9ZUWVedig%3D%3D&branta_secret=05eb145d-b5cb-452a-9256-0bdfd9a15ffa';
  const brantaLightning =
    'lightning:lnbc25840n1p4qml83pp5aztzddx4k87m0wkd6wmgxr9753400mcj7sa89sa392krmueqv9qqdz92d6xzemfdenjqsnjv9h8gcfq95s9xarpva5kueeqtf9jqsn0d36zqvf3ypzhsctdwpkx2cqzzsxqzursp5c6dt82gqpn5vucmqtctur0p3cuur6xqgc6348wtz7adtgug9uf2q9qxpqysgq5yt6x946w3664th4h02pug9yhgszpznqyfwzndjk2sxe0878slqkdhgce4mr5ky2ux4gy4yt0vsy536tencls8fvu5wdzyaq548yf4qqu0lyg7';
  const brantaUnified =
    'bitcoin:bc1q6745z6cy3u0k9nprurh3x804c4r7u3u8vxca2n?lightning=lnbc25830n1p4quq9ppp5zszvpgxtu6uwyur6sf7rayc0meqprqlkv30xjzclh6nzm7gavd8sdzh2d6xzemfdenjqsnjv9h8gcfq95sygetkv4kx7ur9wgsyc6t8dp6xu6twvusy27rpd4cxcefq9pfhgct8d9hxw2gcqzzsxqzursp5fcfx5st7x8rgxra42j47hskmzkcz96mx84xcnvs9lpsmjyzqhw2q9qxpqysgq06lxdc93jjpuqsal9unlfct6wuv0v53yxa8kksl85g3qdw7qks7z9jkq39c6wgzar72luwd38sfj0klyqv0zgns4rq7nafnd8qeuudcqql7at4&branta_id=6%2B70PWdCdIzbZ9%2B9M5Vvx4ggGw0WlFSzvareXLBE8rNzlFfmZA1foLDj5qQ7VXS6VgfZEr0Di7Ewk%2BurZP8jUgAIPkn3uw%3D%3D&branta_secret=77f949c7-3083-45ac-b47e-651699ceb755';
  const notFound = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  test('on-chain address returns empty', async () => {
    const result = await service.verify(onChain);
    expect(result.status).toBe(VerifyStatus.Unknown);
  }, 15000);

  test('lightning returns payment', async () => {
    const result = await service.verify(lightning);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('branta on-chain returns payment', async () => {
    const result = await service.verify(brantaOnChain);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('branta lightning returns payment', async () => {
    const result = await service.verify(brantaLightning);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('branta unified returns payment', async () => {
    const result = await service.verify(brantaUnified);
    expect(result.status).toBe(VerifyStatus.Match);
  }, 15000);

  test('not found returns empty', async () => {
    const result = await service.verify(notFound);
    expect(result.status).toBe(VerifyStatus.Unknown);
  }, 15000);
});
