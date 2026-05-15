import { Destination } from './destination.js';

export interface Payment {
  description?: string;
  destinations: Destination[];
  createdDate?: string;
  ttl?: number;
  metadata?: string;
  platform?: string;
  platformLogoUrl?: string;
  platformLogoLightUrl?: string;
  btcPayServerPluginVersion?: string;
}

export function getDefaultValue(payment: Payment): string {
  const value = payment.destinations?.[0]?.value;
  if (!value) throw new Error('Payment has no destinations.');
  return value;
}
