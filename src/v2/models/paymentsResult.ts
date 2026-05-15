import { Payment } from './payment.js';

export interface PaymentsResult {
  payments: Payment[];
  verifyUrl: string;
}
