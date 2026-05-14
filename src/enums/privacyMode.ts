/**
 * Controls the privacy posture for on-chain address lookups.
 *
 * - `Strict`: Only ZK (zero-knowledge / encrypted) on-chain lookups are permitted.
 *   Calling `getPayments` directly will throw a `BrantaPaymentException`;
 *   plain-address branches inside `getPaymentsByQrCode` will silently return an
 *   empty list. POST operations (`addPayment`) are also restricted: all destinations
 *   must have `isZk = true`, otherwise a `BrantaPaymentException` is thrown.
 * - `Loose`: Both plain and ZK on-chain lookups are allowed. No restrictions are enforced.
 */
export const PrivacyMode = {
  Strict: 'strict',
  Loose: 'loose',
} as const;

export type PrivacyMode = (typeof PrivacyMode)[keyof typeof PrivacyMode];
