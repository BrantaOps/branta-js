import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { Payment } from '../models/payment.js';

export interface IBrantaClient {
  getPayments(destinationValue: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<Payment[]>;
  postPayment(payment: Payment, options?: BrantaClientOptions, signal?: AbortSignal): Promise<Payment | undefined>;
  isApiKeyValid(options?: BrantaClientOptions, signal?: AbortSignal): Promise<boolean>;
}
