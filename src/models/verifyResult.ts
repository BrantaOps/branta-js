import { Destination } from './destination.js';
import { Payment } from './payment.js';

export const VerifyStatus = {
  Match: 'match',
  Unknown: 'unknown',
  Tampered: 'tampered',
  Incomplete: 'incomplete',
} as const;

export type VerifyStatus = (typeof VerifyStatus)[keyof typeof VerifyStatus];

export type VerifyResult =
  | {
      status: typeof VerifyStatus.Match;
      /** Counterparty payment record(s). May still include sibling rails that did not bind. */
      payments: Payment[];
      /**
       * Destinations this scan actually bound — plaintext, with `type`.
       * Use these for what to send; do not dig through `payments[].destinations`.
       */
      matchedDestinations: Destination[];
      verifyUrl: string;
    }
  | { status: typeof VerifyStatus.Unknown; verifyUrl: string }
  | { status: typeof VerifyStatus.Tampered; verifyUrl: string }
  | { status: typeof VerifyStatus.Incomplete; verifyUrl: string };
