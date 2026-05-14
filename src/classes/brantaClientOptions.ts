import { BrantaServerBaseUrl } from '../enums/brantaServerBaseUrl.js';
import { PrivacyMode } from '../enums/privacyMode.js';

export interface BrantaClientOptions {
  baseUrl: BrantaServerBaseUrl;
  defaultApiKey?: string;
  hmacSecret?: string;
  privacy: PrivacyMode;
}
