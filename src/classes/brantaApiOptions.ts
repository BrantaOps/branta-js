import { BrantaEnvironment } from '../enums/brantaEnvironment.js';

export interface BrantaApiOptions {
  environment: BrantaEnvironment;
  apiKey?: string;
  hmacSecret?: string;
}
