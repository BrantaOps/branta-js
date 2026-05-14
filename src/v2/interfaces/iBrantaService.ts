import { BrantaClientOptions } from '../../classes/brantaClientOptions.js';
import { Payment } from '../models/payment.js';

export interface IBrantaService {
  getPayments(destinationValue: string, destinationEncryptionKey?: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<Payment[]>;
  getPaymentsByQrCode(qrText: string, options?: BrantaClientOptions, signal?: AbortSignal): Promise<Payment[]>;
  addPayment(payment: Payment, options?: BrantaClientOptions, signal?: AbortSignal): Promise<{ payment: Payment; secret: string }>;
  isApiKeyValid(options?: BrantaClientOptions, signal?: AbortSignal): Promise<boolean>;
}
