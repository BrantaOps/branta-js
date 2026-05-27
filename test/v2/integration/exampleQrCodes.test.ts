import { describe, expect, test } from '@jest/globals';

import { BrantaServerBaseUrl } from '../../../src/enums/brantaServerBaseUrl.js';
import { PrivacyMode } from '../../../src/enums/privacyMode.js';
import { BrantaService } from '../../../src/v2/services/brantaService.js';

const apiKey = process.env.BRANTA_API_KEY;

const makeService = (baseUrl: BrantaServerBaseUrl, privacy: PrivacyMode) =>
  new BrantaService({ baseUrl, defaultApiKey: apiKey, privacy });

// Production — Loose
describe('Production', () => {
  const service = makeService(BrantaServerBaseUrl.Production, PrivacyMode.Loose);

  const onChain = 'bitcoin:bc1qu3k6geqdjncaarsu2vq56tt8php5vsug9kasmq';
  const lightning =
    'lightning:lnbc232480n1p4qery3pp5a4dpl86fm5aymq2cfmn7jlenmzfvuggsdg3pvya3gvs2k2evne3qdzggfexzmn5vysz6gzzwfskuarpypg8ymmyw43hg6t0dcs95jeqgfhkcapqxycjq3tcv9khqmr9cqzzsxqrrs0sp5cq6hawlu4lwk7f5na347529fm83ez3u2pu87kn9mj57uux549kts9qxpqysgqrfz0sk8a4uslh0yel45t5ykvjzrzqgxw5tswvcggr86as03glj2x0rzeh307t3g3sgj9k44nkxhvvppy5wl7t0yj0zlr9jjjy38y9vgqs28har';
  const zkOnChain =
    'bitcoin:bc1q6745z6cy3u0k9nprurh3x804c4r7u3u8vxca2n?branta_id=z15b5EsbP5LHJrFco38%2BFp%2BHVaiopAY676NCKek8e1Q%2B4a370TyYhvloS8uLCUHfJ4CzeI%2FbOFmFDGpAQszB0gu1pJ1HOQ%3D%3D&branta_secret=c6e9eb30-6258-4432-9847-bdcc4fd4b0db';
  const zkLightning =
    'lightning:lnbc229330n1p4quzc5pp5hp5l8p7xp9h3wnw97rn4dglrpqr086mt58fmqp7aawc5ldrptl6qdzjgfexzmn5vysz6gzyv4mx2mr0wpjhygzvd9nksarwd9hxwgz6v4ex7gztdehhwmr9v3nk2gz90psk6urvv5cqzzsxqrrs0sp54cvw92cc4wd4ds095sts0mqz0kmhs5kkm7pzq3swe5hpjttza3qq9qxpqysgqer7p93xf8gu04mx5v602jn2nw7cgqhst5eznz2chrz2jljyze6l3rpa5ndnnsjczjvhxpcg06x7s6hnrhqlptvwqfapm6scjtccnrcgq0gc2qh';
  const notFound = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  test('on-chain returns payment', async () => {
    const result = await service.getPaymentsByQrCode(onChain);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('lightning returns payment', async () => {
    const result = await service.getPaymentsByQrCode(lightning);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('zk on-chain returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkOnChain);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('zk lightning returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkLightning);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('not found returns empty', async () => {
    const result = await service.getPaymentsByQrCode(notFound);
    expect(result.payments).toHaveLength(0);
  }, 15000);
});

// Production — Strict (plain-text addresses return empty)
describe('Production (strict)', () => {
  const service = makeService(BrantaServerBaseUrl.Production, PrivacyMode.Strict);

  const onChain = 'bitcoin:bc1qu3k6geqdjncaarsu2vq56tt8php5vsug9kasmq';
  const lightning =
    'lightning:lnbc232480n1p4qery3pp5a4dpl86fm5aymq2cfmn7jlenmzfvuggsdg3pvya3gvs2k2evne3qdzggfexzmn5vysz6gzzwfskuarpypg8ymmyw43hg6t0dcs95jeqgfhkcapqxycjq3tcv9khqmr9cqzzsxqrrs0sp5cq6hawlu4lwk7f5na347529fm83ez3u2pu87kn9mj57uux549kts9qxpqysgqrfz0sk8a4uslh0yel45t5ykvjzrzqgxw5tswvcggr86as03glj2x0rzeh307t3g3sgj9k44nkxhvvppy5wl7t0yj0zlr9jjjy38y9vgqs28har';
  const zkOnChain =
    'bitcoin:bc1q6745z6cy3u0k9nprurh3x804c4r7u3u8vxca2n?branta_id=z15b5EsbP5LHJrFco38%2BFp%2BHVaiopAY676NCKek8e1Q%2B4a370TyYhvloS8uLCUHfJ4CzeI%2FbOFmFDGpAQszB0gu1pJ1HOQ%3D%3D&branta_secret=c6e9eb30-6258-4432-9847-bdcc4fd4b0db';
  const zkLightning =
    'lightning:lnbc229330n1p4quzc5pp5hp5l8p7xp9h3wnw97rn4dglrpqr086mt58fmqp7aawc5ldrptl6qdzjgfexzmn5vysz6gzyv4mx2mr0wpjhygzvd9nksarwd9hxwgz6v4ex7gztdehhwmr9v3nk2gz90psk6urvv5cqzzsxqrrs0sp54cvw92cc4wd4ds095sts0mqz0kmhs5kkm7pzq3swe5hpjttza3qq9qxpqysgqer7p93xf8gu04mx5v602jn2nw7cgqhst5eznz2chrz2jljyze6l3rpa5ndnnsjczjvhxpcg06x7s6hnrhqlptvwqfapm6scjtccnrcgq0gc2qh';
  const notFound = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  test('on-chain plain text returns empty', async () => {
    const result = await service.getPaymentsByQrCode(onChain);
    expect(result.payments).toHaveLength(0);
  }, 15000);

  test('lightning plain text returns empty', async () => {
    const result = await service.getPaymentsByQrCode(lightning);
    expect(result.payments).toHaveLength(0);
  }, 15000);

  test('zk on-chain returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkOnChain);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('zk lightning returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkLightning);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('not found plain text returns empty', async () => {
    const result = await service.getPaymentsByQrCode(notFound);
    expect(result.payments).toHaveLength(0);
  }, 15000);
});

// Staging — Loose
describe('Staging', () => {
  const service = makeService(BrantaServerBaseUrl.Staging, PrivacyMode.Loose);

  const onChain = 'bitcoin:bc1qgw3dzmhnyvcswc9r0v0z0ajtp8ulm4nuyeahwr';
  const lightning =
    'lightning:lnbc25830n1p4quq9ppp5zszvpgxtu6uwyur6sf7rayc0meqprqlkv30xjzclh6nzm7gavd8sdzh2d6xzemfdenjqsnjv9h8gcfq95sygetkv4kx7ur9wgsyc6t8dp6xu6twvusy27rpd4cxcefq9pfhgct8d9hxw2gcqzzsxqzursp5fcfx5st7x8rgxra42j47hskmzkcz96mx84xcnvs9lpsmjyzqhw2q9qxpqysgq06lxdc93jjpuqsal9unlfct6wuv0v53yxa8kksl85g3qdw7qks7z9jkq39c6wgzar72luwd38sfj0klyqv0zgns4rq7nafnd8qeuudcqql7at4';
  const zkOnChain =
    'bitcoin:bc1q6745z6cy3u0k9nprurh3x804c4r7u3u8vxca2n?branta_id=z15b5EsbP5LHJrFco38%2BFp%2BHVaiopAY676NCKek8e1Q%2B4a370TyYhvloS8uLCUHfJ4CzeI%2FbOFmFDGpAQszB0gu1pJ1HOQ%3D%3D&branta_secret=c6e9eb30-6258-4432-9847-bdcc4fd4b0db';
  const zkLightning =
    'lightning:lnbc25840n1p4qml83pp5aztzddx4k87m0wkd6wmgxr9753400mcj7sa89sa392krmueqv9qqdz92d6xzemfdenjqsnjv9h8gcfq95s9xarpva5kueeqtf9jqsn0d36zqvf3ypzhsctdwpkx2cqzzsxqzursp5c6dt82gqpn5vucmqtctur0p3cuur6xqgc6348wtz7adtgug9uf2q9qxpqysgq5yt6x946w3664th4h02pug9yhgszpznqyfwzndjk2sxe0878slqkdhgce4mr5ky2ux4gy4yt0vsy536tencls8fvu5wdzyaq548yf4qqu0lyg7';
  const notFound = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  test('on-chain returns payment', async () => {
    const result = await service.getPaymentsByQrCode(onChain);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('lightning returns payment', async () => {
    const result = await service.getPaymentsByQrCode(lightning);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('zk on-chain returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkOnChain);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('zk lightning returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkLightning);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('not found returns empty', async () => {
    const result = await service.getPaymentsByQrCode(notFound);
    expect(result.payments).toHaveLength(0);
  }, 15000);
});

// Staging — Strict (plain-text addresses return empty)
describe('Staging (strict)', () => {
  const service = makeService(BrantaServerBaseUrl.Staging, PrivacyMode.Strict);

  const onChain = 'bitcoin:bc1qgw3dzmhnyvcswc9r0v0z0ajtp8ulm4nuyeahwr';
  const lightning =
    'lightning:lnbc25830n1p4quq9ppp5zszvpgxtu6uwyur6sf7rayc0meqprqlkv30xjzclh6nzm7gavd8sdzh2d6xzemfdenjqsnjv9h8gcfq95sygetkv4kx7ur9wgsyc6t8dp6xu6twvusy27rpd4cxcefq9pfhgct8d9hxw2gcqzzsxqzursp5fcfx5st7x8rgxra42j47hskmzkcz96mx84xcnvs9lpsmjyzqhw2q9qxpqysgq06lxdc93jjpuqsal9unlfct6wuv0v53yxa8kksl85g3qdw7qks7z9jkq39c6wgzar72luwd38sfj0klyqv0zgns4rq7nafnd8qeuudcqql7at4';
  const zkOnChain =
    'bitcoin:bc1q6745z6cy3u0k9nprurh3x804c4r7u3u8vxca2n?branta_id=z15b5EsbP5LHJrFco38%2BFp%2BHVaiopAY676NCKek8e1Q%2B4a370TyYhvloS8uLCUHfJ4CzeI%2FbOFmFDGpAQszB0gu1pJ1HOQ%3D%3D&branta_secret=c6e9eb30-6258-4432-9847-bdcc4fd4b0db';
  const zkLightning =
    'lightning:lnbc25840n1p4qml83pp5aztzddx4k87m0wkd6wmgxr9753400mcj7sa89sa392krmueqv9qqdz92d6xzemfdenjqsnjv9h8gcfq95s9xarpva5kueeqtf9jqsn0d36zqvf3ypzhsctdwpkx2cqzzsxqzursp5c6dt82gqpn5vucmqtctur0p3cuur6xqgc6348wtz7adtgug9uf2q9qxpqysgq5yt6x946w3664th4h02pug9yhgszpznqyfwzndjk2sxe0878slqkdhgce4mr5ky2ux4gy4yt0vsy536tencls8fvu5wdzyaq548yf4qqu0lyg7';
  const notFound = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  test('on-chain plain text returns empty', async () => {
    const result = await service.getPaymentsByQrCode(onChain);
    expect(result.payments).toHaveLength(0);
  }, 15000);

  test('lightning plain text returns empty', async () => {
    const result = await service.getPaymentsByQrCode(lightning);
    expect(result.payments).toHaveLength(0);
  }, 15000);

  test('zk on-chain returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkOnChain);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('zk lightning returns payment', async () => {
    const result = await service.getPaymentsByQrCode(zkLightning);
    expect(result.payments.length).toBeGreaterThan(0);
  }, 15000);

  test('not found plain text returns empty', async () => {
    const result = await service.getPaymentsByQrCode(notFound);
    expect(result.payments).toHaveLength(0);
  }, 15000);
});
