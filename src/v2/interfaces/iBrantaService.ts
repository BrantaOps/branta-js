import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { Payment } from '../models/payment.js';
import { PaymentsResult } from '../models/paymentsResult.js';

export interface IBrantaService {
  verify(input: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<PaymentsResult>;
  addPayment(payment: Payment, options?: BrantaClientOptions, signal?: AbortSignal): Promise<{ payment: Payment; secret: string; verifyUrl: string }>;
  isApiKeyValid(options?: BrantaClientOptions, signal?: AbortSignal): Promise<boolean>;
}
