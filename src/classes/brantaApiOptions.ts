import { BrantaEnvironment } from '../enums/brantaEnvironment.js';

/** Per-call overrides for environment, API key, and HMAC. All fields optional. */
export interface BrantaApiOptions {
  environment?: BrantaEnvironment;
  apiKey?: string;
  /**
   * Secret from the Secrets tab in Guardrail. Signs `POST /v2/payments` with
   * `X-HMAC-Signature` and `X-HMAC-Timestamp`. Needed when your platform has Require HMAC on.
   * Server-side only. See https://developer.branta.pro/setup/receive/hmac-signing
   */
  hmacSecret?: string;
}
