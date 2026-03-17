import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import V2BrantaClient from "../../src/v2/client";
import BrantaPaymentException from "../../src/classes/brantaPaymentException";
import BrantaClientOptions from "../../src/classes/brantaClientOptions";
import AesEncryption from "../../src/helpers/aes";

interface MockResponse {
  ok: boolean;
  status?: number;
  headers?: {
    get: (key: string) => string;
  };
  json?: () => Promise<any>;
  text?: () => Promise<string>;
}

describe("V2BrantaClient", () => {
  let client: V2BrantaClient;
  let mockFetch: jest.Mock<typeof fetch>;
  const defaultOptions: BrantaClientOptions = {
    baseUrl: { url: "http://localhost:3000" },
    defaultApiKey: "test-api-key",
    hmacSecret: null,
  } as BrantaClientOptions;

  const testPayments = [
    {
      destinations: [
        {
          value: "123",
          zk: false,
        },
      ],
    },
    {
      destinations: [
        {
          value: "456",
          zk: false,
        },
      ],
    },
  ];

  beforeEach(() => {
    client = new V2BrantaClient(defaultOptions);
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

    test("should throw exception if baseUrl not set", async () => {
      client = new V2BrantaClient({} as BrantaClientOptions);

      await expect(client.getPayments("test-address")).rejects.toThrow(
        "Branta: BaseUrl is a required option.",
      );
    });
  });

  describe("getZKPayment", () => {
    test("should decrypt ZK destination values", async () => {
      const encryptedValue =
        "pQerSFV+fievHP+guYoGJjx1CzFFrYWHAgWrLhn5473Z19M6+WMScLd1hsk808AEF/x+GpZKmNacFBf5BbQ=";
      const payments = [
        {
          destinations: [
            { zk: true, value: encryptedValue },
            { zk: false, value: "plain-value" },
          ],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "100",
        },
        json: async () => JSON.parse(JSON.stringify(payments)),
      } as MockResponse as Response);

      const result = await client.getZKPayment(encryptedValue, "1234");

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0].destinations[0].value).toBe(
        "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      );
    });

    test("should return unmodified payments with no ZK destinations", async () => {
      const payments = [
        {
          destinations: [{ zk: false, value: "plain-value" }],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "100",
        },
        json: async () => JSON.parse(JSON.stringify(payments)),
      } as MockResponse as Response);

      const result = await client.getZKPayment("plain-value", "test-secret");

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0].destinations[0].value).toBe("plain-value");
    });
  });

  describe("addPayment", () => {
    test("should throw exception when no API key is provided", async () => {
      const payment = testPayments[0];
      const clientWithoutApiKey = new V2BrantaClient({
        baseUrl: "https://production.example.com",
        defaultApiKey: null,
        hmacSecret: null,
      } as BrantaClientOptions);

      await expect(clientWithoutApiKey.addPayment(payment)).rejects.toThrow(
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

      await client.addPayment(payment, customOptions);

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

      await expect(client.addPayment(payment)).rejects.toThrow(
        BrantaPaymentException,
      );
    });

    test("should return parsed response on success", async () => {
      const payment = testPayments[0];

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ...payment }),
      } as MockResponse as Response);

      const result = await client.addPayment(payment);

      const expectedResponse = { payment, verifyLink: 'http://localhost:3000/v2/verify/123' }

      expect(result).toEqual(expectedResponse);
    });
  });

  describe("addZKPayment", () => {
    test("should encrypt ZK destinations and return payment with secret", async () => {
      const plainText = "plain-value";
      const payment = {
        destinations: [
          { zk: true, value: plainText },
          { zk: false, value: "other-value" },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      const result = await client.addZKPayment(payment);

      const zkPayment = result.payment.destinations.find(
        (d) => d.zk == true,
      )!.value;

      expect(await AesEncryption.decrypt(zkPayment, result.secret)).toBe(
        plainText,
      );

      expect(result.payment).toBeDefined();
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

  describe("addPayment with HMAC", () => {
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

      await client.addPayment(payment, optionsWithHmac);

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

      await client.addPayment(payment);

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

      await client.addPayment(payment, optionsWithHmac);

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
      const clientWithHmac = new V2BrantaClient({
        ...defaultOptions,
        hmacSecret: "default-hmac-secret",
      } as BrantaClientOptions);

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await clientWithHmac.addPayment(payment);

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
      const clientWithHmac = new V2BrantaClient({
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
      await clientWithHmac.addPayment(payment);
      const headers1 = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      capturedSignature1 = headers1["X-HMAC-Signature"];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);
      await clientWithHmac.addPayment(payment, customOptions);
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

      await client.addPayment(payment, optionsWithHmac);
      const firstCallHeaders = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      const firstCallSignature = firstCallHeaders["X-HMAC-Signature"];

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.addPayment(payment, optionsWithHmac);
      const secondCallHeaders = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      const secondCallSignature = secondCallHeaders["X-HMAC-Signature"];

      expect(firstCallSignature).toBe(secondCallSignature);

      Date.now = originalDateNow;
    });
  });

  describe("getPaymentsByQRCode", () => {
    let getPaymentsSpy: jest.SpiedFunction<typeof client.getPayments>;
    let getZKPaymentSpy: jest.SpiedFunction<typeof client.getZKPayment>;

    beforeEach(() => {
      getPaymentsSpy = jest.spyOn(client, "getPayments").mockResolvedValue([]);
      getZKPaymentSpy = jest.spyOn(client, "getZKPayment").mockResolvedValue([]);
    });

    test("should dispatch ZK query params to getZKPayment", async () => {
      await client.getPaymentsByQRCode("http://example.com?branta_id=myid&branta_secret=mysecret");
      expect(getZKPaymentSpy).toHaveBeenCalledWith("myid", "mysecret", null);
    });

    test("should dispatch /v2/verify/{id} URL to getPayments", async () => {
      await client.getPaymentsByQRCode("http://localhost:3000/v2/verify/abc123");
      expect(getPaymentsSpy).toHaveBeenCalledWith("abc123", null);
    });

    test("should dispatch /v2/zk-verify/{id}#secret=s URL to getZKPayment", async () => {
      await client.getPaymentsByQRCode("http://localhost:3000/v2/zk-verify/abc123#secret=mysecret");
      expect(getZKPaymentSpy).toHaveBeenCalledWith("abc123", "mysecret", null);
    });

    test("should dispatch /v2/zk-verify/{id} without secret to getPayments", async () => {
      await client.getPaymentsByQRCode("http://localhost:3000/v2/zk-verify/abc123");
      expect(getPaymentsSpy).toHaveBeenCalledWith("abc123", null);
    });

    test("should strip lightning: prefix and lowercase", async () => {
      await client.getPaymentsByQRCode("lightning:LNBC1000N1TEST");
      expect(getPaymentsSpy).toHaveBeenCalledWith("lnbc1000n1test", null);
    });

    test("should strip bitcoin: and lowercase bc1q address", async () => {
      await client.getPaymentsByQRCode("bitcoin:BC1QTEST");
      expect(getPaymentsSpy).toHaveBeenCalledWith("bc1qtest", null);
    });

    test("should strip bitcoin: and preserve case for non-bc1q address", async () => {
      await client.getPaymentsByQRCode("bitcoin:3AbcDef");
      expect(getPaymentsSpy).toHaveBeenCalledWith("3AbcDef", null);
    });

    test("should lowercase bare lnbc address", async () => {
      await client.getPaymentsByQRCode("LNBC1000N1TEST");
      expect(getPaymentsSpy).toHaveBeenCalledWith("lnbc1000n1test", null);
    });

    test("should lowercase bare bc1q address", async () => {
      await client.getPaymentsByQRCode("BC1QTEST");
      expect(getPaymentsSpy).toHaveBeenCalledWith("bc1qtest", null);
    });

    test("should pass plain address through unchanged", async () => {
      await client.getPaymentsByQRCode("some-payment-id");
      expect(getPaymentsSpy).toHaveBeenCalledWith("some-payment-id", null);
    });

    test("should trim surrounding whitespace", async () => {
      await client.getPaymentsByQRCode("  some-payment-id  ");
      expect(getPaymentsSpy).toHaveBeenCalledWith("some-payment-id", null);
    });
  });

  describe("addZKPayment with HMAC", () => {
    test("should include HMAC headers when hmacSecret is provided", async () => {
      const payment = {
        destinations: [{ zk: true, value: "plain-value" }],
      };

      const optionsWithHmac = {
        ...defaultOptions,
        hmacSecret: "test-secret-key",
      } as BrantaClientOptions;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      await client.addZKPayment(payment, optionsWithHmac);

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

    test("should work without HMAC headers", async () => {
      const payment = {
        destinations: [{ zk: true, value: "plain-value" }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      } as MockResponse as Response);

      const result = await client.addZKPayment(payment);

      expect(result.payment).toBeDefined();
      expect(result.secret).toBeDefined();

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      expect(headers["X-HMAC-Signature"]).toBeUndefined();
      expect(headers["X-HMAC-Timestamp"]).toBeUndefined();
    });
  });
});