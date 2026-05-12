import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { BrantaClient } from "../../src/v2/client";
import { Destination } from "../../src/v2/types";
import BrantaPaymentException from "../../src/classes/brantaPaymentException";
import BrantaClientOptions from "../../src/classes/brantaClientOptions";

interface MockResponse {
  ok: boolean;
  status?: number;
  headers?: {
    get: (key: string) => string;
  };
  json?: () => Promise<any>;
  text?: () => Promise<string>;
}

describe("BrantaClient", () => {
  let client: BrantaClient;
  let mockFetch: jest.Mock<typeof fetch>;
  const defaultOptions: BrantaClientOptions = {
    baseUrl: { url: "http://localhost:3000" },
    defaultApiKey: "test-api-key",
    hmacSecret: null,
    privacy: 'loose',
  } as BrantaClientOptions;

  const testPayments: { destinations: Destination[] }[] = [
    {
      destinations: [
        {
          value: "123",
          type: "bitcoin_address",
          zk: false,
        },
      ],
    },
    {
      destinations: [
        {
          value: "456",
          type: "bolt11",
          zk: false,
        },
      ],
    },
  ];

  beforeEach(() => {
    client = new BrantaClient(defaultOptions);
    mockFetch = jest.fn() as jest.Mock<typeof fetch>;
    global.fetch = mockFetch as any;
    jest.clearAllMocks();
  });

  describe("getPayments", () => {
    test("should return payments", async () => {
      const address = "test-address";
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "100",
        },
        json: async () => testPayments,
      } as MockResponse as Response);

      const result = await client.getPayments(address);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result[0].destinations[0].value).toBe("123");
      expect(result[1].destinations[0].value).toBe("456");
    });

    test("should return destination type from payments", async () => {
      const address = "test-address";
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "100",
        },
        json: async () => testPayments,
      } as MockResponse as Response);

      const result = await client.getPayments(address);

      expect(result[0].destinations[0].type).toBe("bitcoin_address");
      expect(result[1].destinations[0].type).toBe("bolt11");
    });

    test("should return empty list on non-success status code", async () => {
      const address = "test-address";
      mockFetch.mockResolvedValue({
        ok: false,
        headers: {
          get: () => "0",
        },
      } as MockResponse as Response);

      const result = await client.getPayments(address);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(0);
    });

    test("should return empty list on null content", async () => {
      const address = "test-address";
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "0",
        },
      } as MockResponse as Response);

      const result = await client.getPayments(address);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(0);
    });

    test("should use custom options", async () => {
      const address = "test-address";
      const customOptions = {
        baseUrl: "https://production.example.com",
      } as BrantaClientOptions;

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "2",
        },
        json: async () => [],
      } as MockResponse as Response);

      await client.getPayments(address, customOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://production.example.com/v2/payments/test-address",
        expect.any(Object),
      );
    });

    test("should URL-encode address with special characters in request path", async () => {
      const address = "DtLpv1Zgf8QAcOAkmt8N3QAsxtHOlqeIBt1OQPb95TVatwznXcjFOq9rrtdaOLGgKT17siGjlToMwkAtawjp5zngIg g==";

      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => "100" },
        json: async () => testPayments,
      } as MockResponse as Response);

      await client.getPayments(address);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/v2/payments/${encodeURIComponent(address)}`,
        expect.any(Object),
      );
    });

    test("should map zk_id from JSON to zkId in destinations", async () => {
      const address = "test-address";
      const payments = [{ destinations: [{ value: "123", zk: true, zk_id: "zk-abc" }] }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => "100" },
        json: async () => payments,
      } as MockResponse as Response);

      const result = await client.getPayments(address);

      expect(result[0].destinations[0].zkId).toBe("zk-abc");
      expect((result[0].destinations[0] as any).zk_id).toBeUndefined();
    });

    test("should map platform_logo_url from JSON to platformLogoUrl when domain matches baseUrl", async () => {
      const address = "test-address";
      const payments = [{ destinations: [{ value: "123", zk: false }], platform_logo_url: "http://localhost:3000/logo.png" }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => "100" },
        json: async () => payments,
      } as MockResponse as Response);

      const result = await client.getPayments(address) as any[];

      expect(result[0].platformLogoUrl).toBe("http://localhost:3000/logo.png");
      expect(result[0].platform_logo_url).toBeUndefined();
    });

    test("should throw BrantaPaymentException when platformLogoUrl domain does not match baseUrl", async () => {
      const address = "test-address";
      const payments = [{ destinations: [{ value: "123", zk: false }], platform_logo_url: "https://evil.com/logo.png" }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => "100" },
        json: async () => payments,
      } as MockResponse as Response);

      await expect(client.getPayments(address)).rejects.toThrow(BrantaPaymentException);
      await expect(client.getPayments(address)).rejects.toThrow("platformLogoUrl domain does not match the configured baseUrl domain");
    });

    test("should throw BrantaPaymentException when platformLogoUrl is an invalid URL", async () => {
      const address = "test-address";
      const payments = [{ destinations: [{ value: "123", zk: false }], platform_logo_url: "not-a-url" }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => "100" },
        json: async () => payments,
      } as MockResponse as Response);

      await expect(client.getPayments(address)).rejects.toThrow(BrantaPaymentException);
      await expect(client.getPayments(address)).rejects.toThrow("platformLogoUrl domain does not match the configured baseUrl domain");
    });

    test("should throw exception if baseUrl not set", async () => {
      client = new BrantaClient({} as BrantaClientOptions);

      await expect(client.getPayments("test-address")).rejects.toThrow(
        "Branta: BaseUrl is a required option.",
      );
    });
  });

  describe("postPayment", () => {
    test("should throw exception when no API key is provided", async () => {
      const payment = testPayments[0];
      const clientWithoutApiKey = new BrantaClient({
        baseUrl: "https://production.example.com",
        defaultApiKey: null,
        hmacSecret: null,
      } as BrantaClientOptions);

      await expect(clientWithoutApiKey.postPayment(payment)).rejects.toThrow(
        BrantaPaymentException,
      );
    });

    test("should use custom API key", async () => {
      const payment = testPayments[0];
      const customOptions = {
        baseUrl: "https://production.example.com",
        defaultApiKey: "custom-api-key",
      } as BrantaClientOptions;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(testPayments[0]),
      } as MockResponse as Response);

      await client.postPayment(payment, customOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://production.example.com/v2/payments",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer custom-api-key",
          }),
        }),
      );
    });

    test("should throw exception on failed response", async () => {
      const payment = testPayments[0];

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      } as MockResponse as Response);

      await expect(client.postPayment(payment)).rejects.toThrow(
        BrantaPaymentException,
      );
    });

    test("should return parsed response on success", async () => {
      const payment = testPayments[0];

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ...payment }),
      } as MockResponse as Response);

      const result = await client.postPayment(payment);

      expect(result).toEqual({ ...payment });
    });

    test("should map zk_id from response JSON to zkId in destinations", async () => {
      const payment = testPayments[0];
      const rawResponse = { destinations: [{ value: "bc1qtest", type: "bitcoin_address", zk: true, zk_id: "zk-response-1" }] };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(rawResponse),
      } as MockResponse as Response);

      const result = await client.postPayment(payment);

      expect(result.destinations[0].zkId).toBe("zk-response-1");
      expect((result.destinations[0] as any).zk_id).toBeUndefined();
    });

    test("should include destination type in POST payload", async () => {
      const payment = {
        destinations: [{ value: "bc1qtest", type: "bitcoin_address" as const }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.postPayment(payment);

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(callBody.destinations[0].type).toBe("bitcoin_address");
    });
  });

  describe("isApiKeyValid", () => {
    test("should return true for valid API key", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      } as MockResponse as Response);

      const result = await client.isApiKeyValid();

      expect(result).toBe(true);
    });

    test("should return false for invalid API key", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      } as MockResponse as Response);

      const result = await client.isApiKeyValid();

      expect(result).toBe(false);
    });

    test("should use custom options", async () => {
      const customOptions = {
        baseUrl: "https://production.example.com",
        defaultApiKey: "custom-key",
      } as BrantaClientOptions;

      mockFetch.mockResolvedValue({
        ok: true,
      } as MockResponse as Response);

      await client.isApiKeyValid(customOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://production.example.com/v2/api-keys/health-check",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer custom-key",
          }),
        }),
      );
    });
  });

  describe("postPayment with HMAC", () => {
    test("should include HMAC headers when hmacSecret is provided", async () => {
      const payment = testPayments[0];
      const optionsWithHmac = {
        ...defaultOptions,
        hmacSecret: "test-secret-key",
      } as BrantaClientOptions;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.postPayment(payment, optionsWithHmac);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/v2/payments",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-HMAC-Signature": expect.any(String),
            "X-HMAC-Timestamp": expect.any(String),
            Authorization: "Bearer test-api-key",
          }),
        }),
      );
    });

    test("should not include HMAC headers when hmacSecret is not provided", async () => {
      const payment = testPayments[0];

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.postPayment(payment);

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      expect(headers["X-HMAC-Signature"]).toBeUndefined();
      expect(headers["X-HMAC-Timestamp"]).toBeUndefined();
      expect(headers.Authorization).toBe("Bearer test-api-key");
    });

    test("should generate correct HMAC signature format", async () => {
      const payment = testPayments[0];
      const optionsWithHmac = {
        ...defaultOptions,
        hmacSecret: "test-secret-key",
      } as BrantaClientOptions;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.postPayment(payment, optionsWithHmac);

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      const signature = headers["X-HMAC-Signature"];
      const timestamp = headers["X-HMAC-Timestamp"];

      expect(signature).toMatch(/^[a-f0-9]{64}$/);
      expect(timestamp).toMatch(/^\d{10}$/);

      const now = Math.floor(Date.now() / 1000);
      expect(parseInt(timestamp)).toBeGreaterThanOrEqual(now - 5);
      expect(parseInt(timestamp)).toBeLessThanOrEqual(now);
    });

    test("should use hmacSecret from default options", async () => {
      const payment = testPayments[0];
      const clientWithHmac = new BrantaClient({
        ...defaultOptions,
        hmacSecret: "default-hmac-secret",
      } as BrantaClientOptions);

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await clientWithHmac.postPayment(payment);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/v2/payments",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-HMAC-Signature": expect.any(String),
            "X-HMAC-Timestamp": expect.any(String),
          }),
        }),
      );
    });

    test("should override default hmacSecret with custom options", async () => {
      const payment = testPayments[0];
      const clientWithHmac = new BrantaClient({
        ...defaultOptions,
        hmacSecret: "default-hmac-secret",
      } as BrantaClientOptions);

      const customOptions = {
        hmacSecret: "custom-hmac-secret",
      } as BrantaClientOptions;

      let capturedSignature1: string, capturedSignature2: string;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);
      await clientWithHmac.postPayment(payment);
      const headers1 = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      capturedSignature1 = headers1["X-HMAC-Signature"];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);
      await clientWithHmac.postPayment(payment, customOptions);
      const headers2 = (mockFetch.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
      capturedSignature2 = headers2["X-HMAC-Signature"];

      expect(capturedSignature1).not.toBe(capturedSignature2);
    });

    test("should generate consistent signature for same inputs", async () => {
      const payment = testPayments[0];
      const optionsWithHmac = {
        ...defaultOptions,
        hmacSecret: "consistent-secret",
      } as BrantaClientOptions;

      const mockTimestamp = "1771444088";
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => parseInt(mockTimestamp) * 1000) as any;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.postPayment(payment, optionsWithHmac);
      const firstCallHeaders = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      const firstCallSignature = firstCallHeaders["X-HMAC-Signature"];

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.postPayment(payment, optionsWithHmac);
      const secondCallHeaders = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      const secondCallSignature = secondCallHeaders["X-HMAC-Signature"];

      expect(firstCallSignature).toBe(secondCallSignature);

      Date.now = originalDateNow;
    });
  });
});
