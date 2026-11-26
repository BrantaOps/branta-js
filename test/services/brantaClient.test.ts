import { describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { BrantaApiOptions } from '../../src/classes/brantaApiOptions.js';
import { BrantaEnvironment } from '../../src/enums/brantaEnvironment.js';
import { BrantaPaymentException } from '../../src/exceptions/brantaPaymentException.js';
import { IncompleteError } from '../../src/exceptions/incompleteError.js';
import { VerifyStatus } from '../../src/models/verifyResult.js';
import { BrantaClient, HTTP_TIMEOUT_MS } from '../../src/services/brantaClient.js';
import { BrantaService } from '../../src/services/brantaService.js';
import { SDK_VERSION } from '../../src/services/sdkVersion.js';

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

  test('default HTTP timeout is 30s', () => {
    expect(HTTP_TIMEOUT_MS).toBe(30_000);
  });

  test('SDK timeout on GET is IncompleteError', async () => {
    const fakeFetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as typeof fetch;
    const client = new BrantaClient(options, fakeFetch, undefined, 20);

    await expect(client.getPayments('value')).rejects.toMatchObject({
      name: 'IncompleteError',
      message: 'Timeout',
    });
  });

  test('caller abort on GET stays AbortError', async () => {
    const controller = new AbortController();
    const fakeFetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as typeof fetch;
    const client = new BrantaClient(options, fakeFetch, undefined, 60_000);
    queueMicrotask(() => controller.abort());

    await expect(client.getPayments('value', undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

const fetchReturningText = (text: string): typeof fetch =>
  jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => text,
  })) as unknown as typeof fetch;

describe('BrantaClient.getPayments malformed body', () => {
  test.each(['not json', '<html>502 Bad Gateway</html>', '[{"a":'])(
    'a body that is not JSON throws IncompleteError: %s',
    async (text) => {
      const client = new BrantaClient(options, fetchReturningText(text));

      await expect(client.getPayments('value')).rejects.toBeInstanceOf(IncompleteError);
    },
  );

  test('a row that cannot be read throws IncompleteError', async () => {
    const client = new BrantaClient(options, fetchReturningText('[null]'));

    await expect(client.getPayments('value')).rejects.toBeInstanceOf(IncompleteError);
  });

  test.each(['{}', 'null', '"text"', '42'])('valid JSON that is not a list is an empty result: %s', async (text) => {
    const client = new BrantaClient(options, fetchReturningText(text));

    await expect(client.getPayments('value')).resolves.toEqual([]);
  });

  test('a logo on the wrong origin still throws, not incomplete', async () => {
    const client = clientWithResponse([{ destinations, platform_logo_url: `${OtherOrigin}/logo.png` }]);

    await expect(client.getPayments('value')).rejects.toThrow(BrantaPaymentException);
  });

  test('verify returns incomplete with a verifyUrl, and does not throw', async () => {
    const service = new BrantaService({
      environment: BrantaEnvironment.Localhost,
      fetchImpl: fetchReturningText('<html>'),
    });

    const result = await service.verify(
      'bitcoin:bc1qgw3dzmhnyvcswc9r0v0z0ajtp8ulm4nuyeahwr?branta_id=abc&branta_secret=def',
    );

    expect(result.status).toBe(VerifyStatus.Incomplete);
    expect(result.verifyUrl).toBe(`${SameOrigin}/v2/verify/abc`);
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

  test('SDK timeout on POST aborts the request', async () => {
    const fakeFetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as typeof fetch;
    const client = new BrantaClient(options, fakeFetch, undefined, 20);

    await expect(client.postPayment(payment)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('X-Branta-SDK header', () => {
  const payment = { destinations: [{ value: 'test-destination' }] };
  const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

  const capturingFetch = (): { fetchImpl: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return { ok: true, status: 200, text: async () => '[]' };
    }) as unknown as typeof fetch;
    return { fetchImpl, calls };
  };

  const headerNames = (init: RequestInit): string[] => Object.keys(init.headers as Record<string, string>).map((h) => h.toLowerCase());

  test('SDK_VERSION matches the package.json version', () => {
    expect(SDK_VERSION).toBe(manifest.version);
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('POST carries js/<manifest version>', async () => {
    const { fetchImpl, calls } = capturingFetch();
    await new BrantaClient(options, fetchImpl).postPayment(payment);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.init.method).toBe('POST');
    expect((calls[0]!.init.headers as Record<string, string>)['X-Branta-SDK']).toBe(`js/${manifest.version}`);
  });

  test('POST header is not part of the body or the HMAC input', async () => {
    const withHmac = { ...options, hmacSecret: 'secret' };
    const { fetchImpl, calls } = capturingFetch();
    await new BrantaClient(withHmac, fetchImpl).postPayment(payment);

    expect(String(calls[0]!.init.body)).not.toContain('X-Branta-SDK');
    expect(String(calls[0]!.init.body)).not.toContain('js/');
    expect(headerNames(calls[0]!.init)).toContain('x-hmac-signature');
  });

  test('GET lookups do not carry it', async () => {
    const { fetchImpl, calls } = capturingFetch();
    await new BrantaClient(options, fetchImpl).getPayments('value');

    expect(calls[0]!.init.method).toBe('GET');
    expect(headerNames(calls[0]!.init)).not.toContain('x-branta-sdk');
  });

  test('api-key health-check GET does not carry it', async () => {
    const { fetchImpl, calls } = capturingFetch();
    await new BrantaClient(options, fetchImpl).isApiKeyValid();

    expect(calls[0]!.init.method).toBe('GET');
    expect(headerNames(calls[0]!.init)).not.toContain('x-branta-sdk');
  });
});
