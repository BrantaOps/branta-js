import { describe, expect, jest, test } from '@jest/globals';

import { BrantaApiOptions } from '../../src/classes/brantaApiOptions.js';
import { BrantaEnvironment } from '../../src/enums/brantaEnvironment.js';
import { BrantaPaymentException } from '../../src/exceptions/brantaPaymentException.js';
import { IncompleteError } from '../../src/exceptions/incompleteError.js';
import { BrantaClient } from '../../src/services/brantaClient.js';

// Matches BrantaEnvironment.Localhost's mapped URL.
const SameOrigin = 'http://localhost:3000';
const OtherOrigin = 'https://attacker.example';

const options: BrantaApiOptions = {
  environment: BrantaEnvironment.Localhost,
  apiKey: 'test-key',
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

  test.each([429, 500, 502, 503, 504])('%s throws IncompleteError', async (status) => {
    const client = clientWithStatus(status);

    await expect(client.getPayments('value')).rejects.toBeInstanceOf(IncompleteError);
  });

  test('network failure throws IncompleteError', async () => {
    const fakeFetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const client = new BrantaClient(options, fakeFetch);

    await expect(client.getPayments('value')).rejects.toBeInstanceOf(IncompleteError);
  });

  test('AbortError is not wrapped as IncompleteError', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    const fakeFetch = jest.fn(async () => {
      throw abort;
    }) as unknown as typeof fetch;
    const client = new BrantaClient(options, fakeFetch);

    await expect(client.getPayments('value')).rejects.toBe(abort);
  });
});

describe('BrantaClient.postPayment HTTP errors', () => {
  const payment = { destinations: [{ value: 'test-destination' }] };

  test('401 throws Unauthorized', async () => {
    const client = clientWithStatus(401);

    await expect(client.postPayment(payment)).rejects.toMatchObject({
      name: 'BrantaPaymentException',
      message: 'Unauthorized',
    });
  });

  test('500 throws InternalServerError', async () => {
    const client = clientWithStatus(500);

    await expect(client.postPayment(payment)).rejects.toMatchObject({
      name: 'BrantaPaymentException',
      message: 'InternalServerError',
    });
  });
});
