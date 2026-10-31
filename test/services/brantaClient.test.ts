import { describe, expect, jest, test } from '@jest/globals';

import { BrantaApiOptions } from '../../src/classes/brantaApiOptions.js';
import { BrantaEnvironment } from '../../src/enums/brantaEnvironment.js';
import { BrantaPaymentException } from '../../src/exceptions/brantaPaymentException.js';
import { BrantaClient } from '../../src/services/brantaClient.js';

// Matches BrantaEnvironment.Localhost's mapped URL.
const SameOrigin = 'http://localhost:3000';
const OtherOrigin = 'https://attacker.example';

const options: BrantaApiOptions = {
  environment: BrantaEnvironment.Localhost,
};

const destinations = [{ value: 'test-destination' }];

const clientWithResponse = (body: unknown): BrantaClient => {
  const fakeFetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
  return new BrantaClient(options, fakeFetch);
};

const clientWithStatus = (status: number, body = ''): BrantaClient => {
  const fakeFetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  })) as unknown as typeof fetch;
  return new BrantaClient(options, fakeFetch);
};

describe('BrantaClient.getPayments logo url validation', () => {
  test('checks every payment logo url, not just the first', async () => {
    const client = clientWithResponse([
      { destinations },
      { destinations, platform_logo_url: `${OtherOrigin}/logo.png` },
    ]);

    await expect(client.getPayments('value')).rejects.toThrow(BrantaPaymentException);
  });

  test('catches mismatched platformLogoLightUrl', async () => {
    const client = clientWithResponse([{ destinations, platform_logo_light_url: `${OtherOrigin}/logo-light.png` }]);

    await expect(client.getPayments('value')).rejects.toThrow(/platformLogoLightUrl/);
  });

  test('catches mismatched parentPlatform.logoUrl', async () => {
    const client = clientWithResponse([{ destinations, parent_platform: { logo_url: `${OtherOrigin}/logo.png` } }]);

    await expect(client.getPayments('value')).rejects.toThrow(/parentPlatform\.logoUrl/);
  });

  test('catches mismatched parentPlatform.logoLightUrl', async () => {
    const client = clientWithResponse([
      { destinations, parent_platform: { logo_light_url: `${OtherOrigin}/logo-light.png` } },
    ]);

    await expect(client.getPayments('value')).rejects.toThrow(/parentPlatform\.logoLightUrl/);
  });

  test('catches mismatched childPlatform.logoUrl', async () => {
    const client = clientWithResponse([{ destinations, child_platform: { logo_url: `${OtherOrigin}/logo.png` } }]);

    await expect(client.getPayments('value')).rejects.toThrow(/childPlatform\.logoUrl/);
  });

  test('catches mismatched childPlatform.logoLightUrl', async () => {
    const client = clientWithResponse([
      { destinations, child_platform: { logo_light_url: `${OtherOrigin}/logo-light.png` } },
    ]);

    await expect(client.getPayments('value')).rejects.toThrow(/childPlatform\.logoLightUrl/);
  });

  test('does not throw when all logo fields are same-origin or absent', async () => {
    const client = clientWithResponse([
      {
        destinations,
        platform_logo_url: `${SameOrigin}/a.png`,
        platform_logo_light_url: `${SameOrigin}/b.png`,
        parent_platform: { logo_url: `${SameOrigin}/c.png`, logo_light_url: `${SameOrigin}/d.png` },
        child_platform: { logo_url: `${SameOrigin}/e.png` },
      },
      { destinations },
    ]);

    const payments = await client.getPayments('value');
    expect(payments).toHaveLength(2);
  });
});

describe('BrantaClient.getPayments HTTP errors', () => {
  test('404 returns an empty list', async () => {
    const client = clientWithStatus(404);

    await expect(client.getPayments('value')).resolves.toEqual([]);
  });

  test('429 returns an empty list', async () => {
    const client = clientWithStatus(429);

    await expect(client.getPayments('value')).resolves.toEqual([]);
  });

  test.each([
    [500, 'InternalServerError'],
    [502, 'BadGateway'],
    [503, 'ServiceUnavailable'],
    [504, 'GatewayTimeout'],
  ])('%s throws %s', async (status, message) => {
    const client = clientWithStatus(status);

    await expect(client.getPayments('value')).rejects.toThrow(BrantaPaymentException);
    await expect(client.getPayments('value')).rejects.toThrow(message);
  });
});
