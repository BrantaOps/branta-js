import { BrantaApiOptions } from '../classes/brantaApiOptions.js';
import { Payment } from '../models/payment.js';
import { VerifyResult } from '../models/verifyResult.js';

export interface IBrantaService {
  verify(input: string, options?: BrantaApiOptions, signal?: AbortSignal): Promise<VerifyResult>;
  addPayment(payment: Payment, options?: BrantaApiOptions, signal?: AbortSignal): Promise<{ payment: Payment; secret: string; verifyUrl: string }>;
  isApiKeyValid(options?: BrantaApiOptions, signal?: AbortSignal): Promise<boolean>;
}
