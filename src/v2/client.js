import AesEncryption from "../helpers/aes.js";
import BrantaPaymentException from "../classes/brantaPaymentException.js";

export class V2BrantaClient {
  constructor(brantaClientOptions) {
    this._defaultOptions = brantaClientOptions;
  }

  async getPayments(address, options = null) {
    const httpClient = this._createClient(options);
    const response = await httpClient.get(`/v2/payments/${address}`);

    if (!response.ok || response.headers.get("content-length") === "0") {
      return [];
    }

    const data = await response.json();
    return data;
  }

  async getZKPayment(address, secret, options = null) {
    const payments = await this.getPayments(address, options);

    for (const payment of payments) {
      for (const destination of payment.destinations) {
        if (destination.isZk === false) continue;
        destination.value = await AesEncryption.decrypt(
          destination.value,
          secret,
        );
      }
    }

    return payments;
  }

  async addPayment(payment, options = null) {
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
    return JSON.parse(responseBody);
  }

  async addZKPayment(payment, options = null) {
    const secret = crypto.randomUUID();

    for (const destination of payment.destinations) {
      if (destination.isZk === false) continue;
      destination.value = await AesEncryption.encrypt(
        destination.value,
        secret,
      );
    }

    const responsePayment = await this.addPayment(payment, options);
    return { payment: responsePayment, secret };
  }

  async isApiKeyValid(options = null) {
    const httpClient = this._createClient(options);
    this._setApiKey(httpClient, options);

    const response = await fetch(
      `${httpClient.baseURL}/v2/api-keys/health-check`,
      {
        headers: httpClient.headers,
      },
    );

    return response.ok;
  }

  _createClient(options) {
    const baseUrl = options?.baseUrl ?? this._defaultOptions?.baseUrl;

    if (!baseUrl?.url) {
      throw new Error("Branta: BaseUrl is a required option.");
    }

    const fullBaseUrl = baseUrl.url;

    return {
      baseURL: fullBaseUrl,
      headers: {},
      async get(url, config = {}) {
        const response = await fetch(`${this.baseURL}${url}`, {
          method: "GET",
          headers: { ...this.headers, ...config?.headers },
          signal: config?.signal,
        });
        return response;
      },
      async post(url, data, config = {}) {
        const response = await fetch(`${this.baseURL}${url}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.headers,
            ...config?.headers,
          },
          body: JSON.stringify(data),
          signal: config?.signal,
        });
        return response;
      },
    };
  }

  _setApiKey(httpClient, options) {
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

  async _setHmacHeaders(httpClient, method, url, body, options) {
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
