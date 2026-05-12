import BrantaPaymentException from "../classes/brantaPaymentException.js";
import BrantaClientOptions from "../classes/brantaClientOptions.js";
import { DestinationType, IBrantaClient, Payment } from "./types.js";

type RawDestination = {
  value: string;
  type?: string;
  zk?: boolean;
  zk_id?: string;
  primary?: boolean;
};

type RawPayment = Omit<Payment, 'destinations' | 'platformLogoUrl' | 'platformLogoLightUrl' | 'verifyUrl' | 'createdAt'> & {
  platform_logo_url?: string;
  platform_logo_light_url?: string;
  verify_url?: string;
  created_at?: string;
  destinations?: RawDestination[];
};

function mapPayment({ platform_logo_url, platform_logo_light_url, verify_url, created_at, destinations, ...rest }: RawPayment): Payment {
  return {
    ...rest,
    platformLogoUrl: platform_logo_url,
    platformLogoLightUrl: platform_logo_light_url,
    verifyUrl: verify_url,
    createdAt: created_at,
    destinations: (destinations ?? []).map(({ zk_id, primary, type, ...d }) => ({
      ...d,
      type: type as DestinationType | undefined,
      zkId: zk_id,
      isPrimary: primary,
    })),
  };
}

interface HttpClient {
  baseURL: string;
  headers: Record<string, string>;
  timeout: number;
  get(url: string, config?: RequestConfig): Promise<Response>;
  post(url: string, data: unknown, config?: RequestConfig): Promise<Response>;
}

interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class BrantaClient implements IBrantaClient {
  private _defaultOptions: BrantaClientOptions;

  constructor(brantaClientOptions: BrantaClientOptions) {
    this._defaultOptions = brantaClientOptions;
  }

  async getPayments(address: string, options: BrantaClientOptions | null = null): Promise<Payment[]> {
    const httpClient = this._createClient(options);
    const response = await httpClient.get(`/v2/payments/${encodeURIComponent(address)}`);

    if (!response.ok || response.headers.get("content-length") === "0") {
      return [];
    }

    const raw = await response.json() as RawPayment[];
    const data: Payment[] = raw.map(mapPayment);

    const baseUrl = this._resolveBaseUrl(options);
    const baseOrigin = new URL(baseUrl).origin;

    for (const payment of data) {
      if (payment.platformLogoUrl) {
        let valid = false;
        try { valid = new URL(payment.platformLogoUrl).origin === baseOrigin; } catch { /* invalid URL */ }
        if (!valid) throw new BrantaPaymentException("platformLogoUrl domain does not match the configured baseUrl domain");
      }
      if (payment.platformLogoLightUrl) {
        let valid = false;
        try { valid = new URL(payment.platformLogoLightUrl).origin === baseOrigin; } catch { /* invalid URL */ }
        if (!valid) throw new BrantaPaymentException("platformLogoLightUrl domain does not match the configured baseUrl domain");
      }
    }
    return data;
  }

  async postPayment(payment: Payment, options: BrantaClientOptions | null = null): Promise<Payment> {
    const httpClient = this._createClient(options);
    this._setApiKey(httpClient, options);
    await this._setHmacHeaders(
      httpClient,
      "POST",
      "/v2/payments",
      payment,
      options,
    );

    const response = await httpClient.post("/v2/payments", payment);

    if (!response.ok) {
      throw new BrantaPaymentException(response.status.toString());
    }

    const responseBody = await response.text();
    return mapPayment(JSON.parse(responseBody) as RawPayment);
  }

  async isApiKeyValid(options: BrantaClientOptions | null = null): Promise<boolean> {
    const httpClient = this._createClient(options);
    this._setApiKey(httpClient, options);

    const response = await httpClient.get("/v2/api-keys/health-check");

    return response.ok;
  }

  private _resolveBaseUrl(options: BrantaClientOptions | null): string {
    const baseUrl = options?.baseUrl ?? this._defaultOptions?.baseUrl;
    return typeof baseUrl === 'string' ? baseUrl : baseUrl?.url ?? '';
  }

  private _createClient(options: BrantaClientOptions | null): HttpClient {
    const baseUrl = options?.baseUrl ?? this._defaultOptions?.baseUrl;
    const timeout = options?.timeout ?? this._defaultOptions?.timeout ?? 10000;

    const fullBaseUrl = typeof baseUrl === 'string' ? baseUrl : baseUrl?.url;

    if (!fullBaseUrl) {
      throw new Error("Branta: BaseUrl is a required option.");
    }

    return {
      baseURL: fullBaseUrl,
      headers: {},
      timeout,
      async get(url: string, config: RequestConfig = {}): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(`${this.baseURL}${url}`, {
            method: "GET",
            headers: { ...this.headers, ...config?.headers },
            signal: config?.signal ?? controller.signal,
          });
          return response;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new BrantaPaymentException('Request timeout');
          }
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      },
      async post(url: string, data: unknown, config: RequestConfig = {}): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(`${this.baseURL}${url}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...this.headers,
              ...config?.headers,
            },
            body: JSON.stringify(data),
            signal: config?.signal ?? controller.signal,
          });
          return response;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new BrantaPaymentException('Request timeout');
          }
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      },
    };
  }

  private _setApiKey(httpClient: HttpClient, options: BrantaClientOptions | null): void {
    const apiKey =
      options?.defaultApiKey ?? this._defaultOptions?.defaultApiKey;

    if (!apiKey) {
      throw new BrantaPaymentException("Unauthorized");
    }

    httpClient.headers = {
      ...httpClient.headers,
      Authorization: `Bearer ${apiKey}`,
    };
  }

  private async _setHmacHeaders(
    httpClient: HttpClient,
    method: string,
    url: string,
    body: unknown,
    options: BrantaClientOptions | null
  ): Promise<void> {
    const hmacSecret = options?.hmacSecret ?? this._defaultOptions?.hmacSecret;

    if (!hmacSecret) {
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyString = JSON.stringify(body);
    const message = `${method}|${httpClient.baseURL}${url}|${bodyString}|${timestamp}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(hmacSecret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      messageData,
    );

    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase();

    httpClient.headers = {
      ...httpClient.headers,
      "X-HMAC-Signature": signature,
      "X-HMAC-Timestamp": timestamp,
    };
  }
}

export default BrantaClient;
