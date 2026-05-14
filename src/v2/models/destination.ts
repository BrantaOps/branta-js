import { DestinationType } from '../../enums/destinationType.js';

export interface Destination {
  value: string;
  isPrimary?: boolean;
  isZk?: boolean;
  type?: DestinationType;
  zkId?: string;
}
