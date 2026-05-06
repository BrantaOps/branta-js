import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import HttpClient from "../../src/v2/httpClient";
import BrantaPaymentException from "../../src/classes/brantaPaymentException";

describe("HttpClient", () => {
  let mockFetch: jest.Mock<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.Mock<typeof fetch>;
    global.fetch = mockFetch as any;
  });

  describe("get", () => {
    test("should issue GET to baseUrl + path with no body and no Content-Type", async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      const client = new HttpClient("http://localhost:3000", 5000);

      await client.get("/v2/payments/abc");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3000/v2/payments/abc");
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
    });

    test("should include configured headers on GET", async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      const client = new HttpClient("http://localhost:3000", 5000);
      client.headers = { Authorization: "Bearer token-123" };

      await client.get("/v2/api-keys/health-check");

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer token-123");
    });
  });

  describe("post", () => {
    test("should issue POST with JSON body and Content-Type header", async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      const client = new HttpClient("http://localhost:3000", 5000);
      const body = { foo: "bar", n: 1 };

      await client.post("/v2/payments", body);

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3000/v2/payments");
      expect(init.method).toBe("POST");
      expect(init.body).toBe(JSON.stringify(body));
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    test("should merge configured headers with Content-Type on POST", async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      const client = new HttpClient("http://localhost:3000", 5000);
      client.headers = {
        Authorization: "Bearer token-123",
        "X-HMAC-Signature": "abc",
      };

      await client.post("/v2/payments", { x: 1 });

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers.Authorization).toBe("Bearer token-123");
      expect(headers["X-HMAC-Signature"]).toBe("abc");
    });

    test("should not allow configured Content-Type to override the JSON one", async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      const client = new HttpClient("http://localhost:3000", 5000);
      client.headers = { "Content-Type": "text/plain" };

      await client.post("/v2/payments", { x: 1 });

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("text/plain");
    });
  });

  describe("timeout / abort", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test("should throw BrantaPaymentException('Request timeout') when fetch aborts", async () => {
      mockFetch.mockImplementation((_input, init) => {
        return new Promise((_resolve, reject) => {
          const signal = (init as RequestInit).signal as AbortSignal;
          signal.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });

      const client = new HttpClient("http://localhost:3000", 1000);
      const promise = client.get("/slow");
      jest.advanceTimersByTime(1001);

      await expect(promise).rejects.toThrow(BrantaPaymentException);
      await expect(promise).rejects.toThrow("Request timeout");
    });

    test("should rethrow non-AbortError unchanged", async () => {
      const original = new Error("network down");
      mockFetch.mockRejectedValue(original);

      const client = new HttpClient("http://localhost:3000", 1000);

      await expect(client.get("/anything")).rejects.toBe(original);
    });

    test("should clear the timeout when fetch resolves", async () => {
      const clearSpy = jest.spyOn(global, "clearTimeout");
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const client = new HttpClient("http://localhost:3000", 5000);
      await client.get("/v2/payments/abc");

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  describe("request", () => {
    test("should support arbitrary verbs without a body", async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      const client = new HttpClient("http://localhost:3000", 5000);

      await client.request("DELETE", "/v2/payments/abc");

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe("DELETE");
      expect(init.body).toBeUndefined();
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
    });
  });
});
