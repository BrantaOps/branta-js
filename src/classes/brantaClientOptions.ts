import { ServerEnvironment } from "./brantaServerBaseUrl.js";

/**
 * Controls the privacy posture for on-chain address lookups.
 *
 * - `'strict'` — Only ZK (zero-knowledge / encrypted) on-chain lookups are
 *   permitted. Calling `getPayments` directly will throw a
 *   `BrantaPaymentException`; plain-address branches inside
 *   `getPaymentByQrCode` will silently return `[]`. Lightning invoices and
 *   all POST operations are unaffected by this setting.
 *
 * - `'loose'` — Both plain and ZK on-chain lookups are allowed. No
 *   restrictions are enforced.
 */
export type PrivacyMode = 'strict' | 'loose';

export default interface BrantaClientOptions {
  baseUrl?: ServerEnvironment | string | null;
  defaultApiKey?: string | null;
  hmacSecret?: string | null;
  timeout?: number;
  /** @see {@link PrivacyMode} */
  privacy: PrivacyMode;
}
