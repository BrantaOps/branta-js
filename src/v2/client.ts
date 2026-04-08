import AesEncryption from "../helpers/aes.js";
import BrantaPaymentException from "../classes/brantaPaymentException.js";
import BrantaClientOptions from "../classes/brantaClientOptions.js";

export type DestinationType = 'bitcoin_address' | 'ln_address' | 'bolt11' | 'bolt12' | 'ln_url' | 'tether_address' | 'ark_address';

export interface Destination {
  value: string;
  type?: DestinationType;
  zk?: boolean;
}

export interface Payment {
  destinations: Destination[];
  ttl?: number;
  description?: string;
  metadata?: Record<string, string>;
  verifyUrl?: string;
  platformLogoUrl?: string;
  platformLogoLightUrl?: string;
}

interface PaymentResponse extends Payment {
  createdAt: Date;
  platform: string;
}

interface PaymentResult {
  payment: PaymentResponse;
  verifyLink: string;
}

interface ZKPaymentResult extends PaymentResult {
  secret: string;
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

export class V2BrantaClient {
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

    const raw = await response.json() as (PaymentResponse & {
      platform_logo_url?: string;
      platform_logo_light_url?: string;
      verify_url?: string;
    })[];

    const data: PaymentResponse[] = raw.map(({
      platform_logo_url: platformLogoUrl,
      platform_logo_light_url: platformLogoLightUrl,
      verify_url: verifyUrl,
      ...rest
    }) => ({
      ...rest,
      platformLogoUrl,
      platformLogoLightUrl,
      verifyUrl,
    }));

    const baseUrl = this._resolveBaseUrl(options);
    const baseOrigin = new URL(baseUrl).origin;

    for (const payment of data) {
      payment.verifyUrl = this._buildVerifyUrl(baseUrl, address);
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

  async getZKPayment(address: string, secret: string, options: BrantaClientOptions | null = null): Promise<Payment[]> {
    const payments = await this.getPayments(address, options);

    for (const payment of payments) {
      for (const destination of payment?.destinations || []) {
        if (destination.zk === false) continue;
        destination.value = await AesEncryption.decrypt(
          destination.value,
          secret,
        );
      }
    }

    const baseUrl = this._resolveBaseUrl(options);
    for (const payment of payments) {
      payment.verifyUrl = this._buildVerifyUrl(baseUrl, address, secret);
    }

    return payments;
  }

  async addPayment(payment: Payment, options: BrantaClientOptions | null = null): Promise<PaymentResult> {
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
    const paymentResponse = JSON.parse(responseBody) as PaymentResponse;

    paymentResponse.verifyUrl = this._buildVerifyUrl(httpClient.baseURL, payment.destinations[0].value);
    const verifyLink = httpClient.baseURL + "/v2/verify/" + encodeURIComponent(payment.destinations[0].value);

    return { payment: paymentResponse, verifyLink };
  }

  async addZKPayment(payment: Payment, options: BrantaClientOptions | null = null): Promise<ZKPaymentResult> {
    const secret = crypto.randomUUID();

    for (const destination of payment?.destinations || []) {
      if (destination.zk === false) continue;
      destination.value = await AesEncryption.encrypt(
        destination.value,
        secret,
      );
    }

    const responsePayment = (await this.addPayment(payment, options)) as ZKPaymentResult;

    responsePayment.secret = secret;
    responsePayment.verifyLink = responsePayment.verifyLink.replace('verify', 'zk-verify') + "#secret=" + secret;
    responsePayment.payment.verifyUrl = this._buildVerifyUrl(this._resolveBaseUrl(options), payment.destinations[0].value, secret);

    return responsePayment;
  }

  async getPaymentsByQRCode(qrText: string, options: BrantaClientOptions | null = null): Promise<Payment[]> {
    const text = qrText.trim();

    let url: URL | null = null;
    try { url = new URL(text); } catch { /* not a URL */ }

    if (url) {
      const rawParams = new URLSearchParams(url.search.replace(/\+/g, '%2B'));
      const brantaId = rawParams.get('branta_id');
      const brantaSecret = rawParams.get('branta_secret');
      if (brantaId && brantaSecret) {
        return this.getZKPayment(brantaId, brantaSecret, options);
      }

      if (url.protocol === 'bitcoin:') {
        return this.getPayments(this._normalizeAddress(url.pathname), options);
      }

      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const baseUrl = this._resolveBaseUrl(options);
        if (baseUrl && new URL(baseUrl).origin === url.origin) {
          const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
          const [version, type, id] = segments;
          if (version === 'v2' && id) {
            if (type === 'verify') return this.getPayments(id, options);
            if (type === 'zk-verify') {
              const secret = new URLSearchParams(url.hash.slice(1)).get('secret');
              return secret
                ? this.getZKPayment(id, secret, options)
                : this.getPayments(id, options);
            }
          }
          const lastSegment = segments.at(-1);
          if (lastSegment) return this.getPayments(lastSegment, options);
        }
      }
    }

    return this.getPayments(this._normalizeAddress(text), options);
  }

  async isApiKeyValid(options: BrantaClientOptions | null = null): Promise<boolean> {
    const httpClient = this._createClient(options);
    this._setApiKey(httpClient, options);

    const response = await httpClient.get("/v2/api-keys/health-check");

    return response.ok;
  }

  private _buildVerifyUrl(baseUrl: string, address: string, secret?: string): string {
    const encoded = encodeURIComponent(address);
    if (secret) {
      return `${baseUrl}/v2/zk-verify/${encoded}#secret=${secret}`;
    }
    return `${baseUrl}/v2/verify/${encoded}`;
  }

  private _resolveBaseUrl(options: BrantaClientOptions | null): string {
    const baseUrl = options?.baseUrl ?? this._defaultOptions?.baseUrl;
    return typeof baseUrl === 'string' ? baseUrl : baseUrl?.url ?? '';
  }

  private _normalizeAddress(text: string): string {
    const lower = text.toLowerCase();
    if (lower.startsWith('lightning:')) return lower.slice('lightning:'.length);
    if (lower.startsWith('bitcoin:')) {
      const addr = text.slice('bitcoin:'.length);
      const addrLower = addr.toLowerCase();
      return addrLower.startsWith('bc1q') || addrLower.startsWith('bcrt') ? addrLower : addr;
    }
    if (lower.startsWith('lnbc') || lower.startsWith('bc1q')) return lower;
    return text;
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

export default V2BrantaClient;