import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import V2BrantaClient from "../../src/v2/client.js";
import BrantaPaymentException from "../../src/classes/brantaPaymentException.js";
import AesEncryption from "../../src/helpers/aes.js";

describe("V2BrantaClient", () => {
  let client;
  let mockFetch;
  const defaultOptions = {
    baseUrl: { url: "http://localhost:3000" },
    defaultApiKey: "test-api-key",
  };

  const testPayments = [
    {
      destinations: [
        {
          value: "123",
          isZk: false,
        },
      ],
    },
    {
      destinations: [
        {
          value: "456",
          isZk: false,
        },
      ],
    },
  ];

  beforeEach(() => {
    client = new V2BrantaClient(defaultOptions);
    mockFetch = jest.fn();
    global.fetch = mockFetch;
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
      });

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
      });

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
      });

      const result = await client.getPayments(address);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(0);
    });

    test("should use custom options", async () => {
      const address = "test-address";
      const customOptions = {
        baseUrl: { url: "https://production.example.com" },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "2",
        },
        json: async () => [],
      });

      await client.getPayments(address, customOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://production.example.com/v2/payments/test-address",
        expect.any(Object),
      );
    });

    test("should throw exception if baseUrl not set", async () => {
      client = new V2BrantaClient({});

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
            { isZk: true, value: encryptedValue },
            { isZk: false, value: "plain-value" },
          ],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "100",
        },
        json: async () => JSON.parse(JSON.stringify(payments)),
      });

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
          destinations: [{ isZk: false, value: "plain-value" }],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "100",
        },
        json: async () => JSON.parse(JSON.stringify(payments)),
      });

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
        baseUrl: { url: "https://production.example.com" },
        defaultApiKey: null,
      });

      await expect(clientWithoutApiKey.addPayment(payment)).rejects.toThrow(
        BrantaPaymentException,
      );
    });

    test("should use custom API key", async () => {
      const payment = testPayments[0];
      const customOptions = {
        baseUrl: { url: "https://production.example.com" },
        defaultApiKey: "custom-api-key",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(testPayments[0]),
      });

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
      });

      await expect(client.addPayment(payment)).rejects.toThrow(
        BrantaPaymentException,
      );
    });

    test("should return parsed response on success", async () => {
      const payment = testPayments[0];
      const expectedResponse = { ...payment, id: "12345" };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(expectedResponse),
      });

      const result = await client.addPayment(payment);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe("addZKPayment", () => {
    test("should encrypt ZK destinations and return payment with secret", async () => {
      const plainText = "plain-value";
      const payment = {
        destinations: [
          { isZk: true, value: plainText },
          { isZk: false, value: "other-value" },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

      const result = await client.addZKPayment(payment);

      const zkPayment = result.payment.destinations.find(
        (d) => d.isZk == true,
      ).value;

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
      });

      const result = await client.isApiKeyValid();

      expect(result).toBe(true);
    });

    test("should return false for invalid API key", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const result = await client.isApiKeyValid();

      expect(result).toBe(false);
    });

    test("should use custom options", async () => {
      const customOptions = {
        baseUrl: { url: "https://production.example.com" },
        defaultApiKey: "custom-key",
      };

      mockFetch.mockResolvedValue({
        ok: true,
      });

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
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

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
      });

      await client.addPayment(payment);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers["X-HMAC-Signature"]).toBeUndefined();
      expect(callArgs.headers["X-HMAC-Timestamp"]).toBeUndefined();
      expect(callArgs.headers.Authorization).toBe("Bearer test-api-key");
    });

    test("should generate correct HMAC signature format", async () => {
      const payment = testPayments[0];
      const optionsWithHmac = {
        ...defaultOptions,
        hmacSecret: "test-secret-key",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

      await client.addPayment(payment, optionsWithHmac);

      const callArgs = mockFetch.mock.calls[0][1];
      const signature = callArgs.headers["X-HMAC-Signature"];
      const timestamp = callArgs.headers["X-HMAC-Timestamp"];

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
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

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
      });

      const customOptions = {
        hmacSecret: "custom-hmac-secret",
      };

      let capturedSignature1, capturedSignature2;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(payment),
      });
      await clientWithHmac.addPayment(payment);
      capturedSignature1 =
        mockFetch.mock.calls[0][1].headers["X-HMAC-Signature"];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(payment),
      });
      await clientWithHmac.addPayment(payment, customOptions);
      capturedSignature2 =
        mockFetch.mock.calls[1][1].headers["X-HMAC-Signature"];

      expect(capturedSignature1).not.toBe(capturedSignature2);
    });

    test("should generate consistent signature for same inputs", async () => {
      const payment = testPayments[0];
      const optionsWithHmac = {
        ...defaultOptions,
        hmacSecret: "consistent-secret",
      };

      const mockTimestamp = "1771444088";
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => parseInt(mockTimestamp) * 1000);

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

      await client.addPayment(payment, optionsWithHmac);
      const firstCallSignature =
        mockFetch.mock.calls[0][1].headers["X-HMAC-Signature"];

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

      await client.addPayment(payment, optionsWithHmac);
      const secondCallSignature =
        mockFetch.mock.calls[0][1].headers["X-HMAC-Signature"];

      expect(firstCallSignature).toBe(secondCallSignature);

      Date.now = originalDateNow;
    });
  });

  describe("addZKPayment with HMAC", () => {
    test("should include HMAC headers when hmacSecret is provided", async () => {
      const payment = {
        destinations: [{ isZk: true, value: "plain-value" }],
      };

      const optionsWithHmac = {
        ...defaultOptions,
        hmacSecret: "test-secret-key",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

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
        destinations: [{ isZk: true, value: "plain-value" }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payment),
      });

      const result = await client.addZKPayment(payment);

      expect(result.payment).toBeDefined();
      expect(result.secret).toBeDefined();

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers["X-HMAC-Signature"]).toBeUndefined();
      expect(callArgs.headers["X-HMAC-Timestamp"]).toBeUndefined();
    });
  });
});
