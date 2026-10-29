import { DestinationType } from '../../enums/destinationType.js';

export interface Destination {
  value: string;
  isPrimary?: boolean;
  isEncrypted?: boolean;
  type?: DestinationType;
  zkId?: string;
  encryptedDek?: string;
}
