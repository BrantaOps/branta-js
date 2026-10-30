import { BrantaEnvironment } from '../enums/brantaEnvironment.js';

/** Per-call overrides for environment, API key, and HMAC. All fields optional. */
export interface BrantaApiOptions {
  environment?: BrantaEnvironment;
  apiKey?: string;
  hmacSecret?: string;
}
