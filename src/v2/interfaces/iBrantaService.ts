import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { Payment } from '../models/payment.js';
import { VerifyResult } from '../models/verifyResult.js';

export interface IBrantaService {
  verify(input: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<VerifyResult>;
  addPayment(payment: Payment, options?: BrantaClientOptions, signal?: AbortSignal): Promise<{ payment: Payment; secret: string; verifyUrl: string }>;
  isApiKeyValid(options?: BrantaClientOptions, signal?: AbortSignal): Promise<boolean>;
}
