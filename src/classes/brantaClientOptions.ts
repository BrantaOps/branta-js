import { BrantaServerBaseUrl } from '../enums/brantaServerBaseUrl.js';

export interface BrantaClientOptions {
  baseUrl: BrantaServerBaseUrl;
  defaultApiKey?: string;
  hmacSecret?: string;
}
