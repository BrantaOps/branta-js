import { describe, expect, jest, test } from '@jest/globals';

import { BrantaClientOptions } from '../../../src/classes/brantaClientOptions.js';
import { BrantaServerBaseUrl } from '../../../src/enums/brantaServerBaseUrl.js';
import { PrivacyMode } from '../../../src/enums/privacyMode.js';
import { BrantaPaymentException } from '../../../src/exceptions/brantaPaymentException.js';
import { BrantaClient } from '../../../src/v2/services/brantaClient.js';

// Matches BrantaServerBaseUrl.Localhost's mapped URL.
const SameOrigin = 'http://localhost:3000';
const OtherOrigin = 'https://attacker.example';

const options: BrantaClientOptions = {
  baseUrl: BrantaServerBaseUrl.Localhost,
  privacy: PrivacyMode.Loose,
};

const destinations = [{ value: 'test-destination' }];

const clientWithResponse = (body: unknown): BrantaClient => {
  const fakeFetch = jest.fn(async () => ({
    ok: true,
    text: async () => JSON.stringify(body),
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
