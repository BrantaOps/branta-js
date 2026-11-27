import { Destination } from './destination.js';
import { Platform } from './platform.js';

export interface Payment {
  description?: string;
  destinations: Destination[];
  createdDate?: string;
  /** Time to live in seconds. */
  ttl?: number;
  metadata?: string;
  platform?: string;
  platformLogoUrl?: string;
  platformLogoLightUrl?: string;
  parentPlatform?: Platform;
  /** The payee a shared-key platform tags the payment with. Wins over `childPlatform` when both are set. */
  brand?: Platform;
  /** @deprecated Use `brand`. */
  childPlatform?: Platform;
  isMetadataDecrypted?: boolean;
}
