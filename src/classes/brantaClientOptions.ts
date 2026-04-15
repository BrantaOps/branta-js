import { ServerEnvironment } from "./brantaServerBaseUrl.js";

export default interface BrantaClientOptions {
  baseUrl?: ServerEnvironment | string | null;
  defaultApiKey?: string | null;
  hmacSecret?: string | null;
  timeout?: number;
  zkOnly?: boolean;
}