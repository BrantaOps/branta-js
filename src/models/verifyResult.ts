import { Payment } from './payment.js';

export const VerifyStatus = {
  Match: 'match',
  Unknown: 'unknown',
  Tampered: 'tampered',
} as const;

export type VerifyStatus = (typeof VerifyStatus)[keyof typeof VerifyStatus];

export type VerifyResult =
  | { status: typeof VerifyStatus.Match; payments: Payment[]; verifyUrl: string }
  | { status: typeof VerifyStatus.Unknown; verifyUrl: string }
  | { status: typeof VerifyStatus.Tampered; verifyUrl: string };
