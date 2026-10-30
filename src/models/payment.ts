import { Destination } from './destination.js';
import { Platform } from './platform.js';

export interface Payment {
  description?: string;
  destinations: Destination[];
  createdDate?: string;
  ttl?: number;
  metadata?: string;
  platform?: string;
  platformLogoUrl?: string;
  platformLogoLightUrl?: string;
  parentPlatform?: Platform;
  childPlatform?: Platform;
  isMetadataDecrypted?: boolean;
}
