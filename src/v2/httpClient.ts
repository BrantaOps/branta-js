import BrantaPaymentException from "../classes/brantaPaymentException.js";

export class HttpClient {
  headers: Record<string, string> = {};

  constructor(
    public readonly baseUrl: string,
    private readonly timeout: number,
  ) {}

  async request(method: string, path: string, body?: unknown): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...this.headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new BrantaPaymentException("Request timeout");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  get(path: string): Promise<Response> {
    return this.request("GET", path);
  }

  post(path: string, body: unknown): Promise<Response> {
    return this.request("POST", path, body);
  }
}

export default HttpClient;
