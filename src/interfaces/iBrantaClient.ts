import { BrantaApiOptions } from '../classes/brantaApiOptions.js';
import { Payment } from '../models/payment.js';

export interface IBrantaClient {
  getPayments(destinationValue: string, options?: BrantaApiOptions, signal?: AbortSignal): Promise<Payment[]>;
  postPayment(payment: Payment, options?: BrantaApiOptions, signal?: AbortSignal): Promise<Payment | undefined>;
  isApiKeyValid(options?: BrantaApiOptions, signal?: AbortSignal): Promise<boolean>;
}
