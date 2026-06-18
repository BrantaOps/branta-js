import type { BrantaCryptoProvider } from '../../index.js';
import { DestinationType } from '../../enums/destinationType.js';
import { Destination } from '../models/destination.js';
import { Payment } from '../models/payment.js';

export class PaymentBuilder {
  private readonly payment: Payment = { destinations: [] };

  constructor(private readonly crypto?: Pick<BrantaCryptoProvider, 'randomUUID'>) {}

  addDestination(address: string, type?: DestinationType): this {
    const destination: Destination = {
      value: address,
      isZk: false,
    };
    if (type !== undefined) destination.type = type;
    this.payment.destinations.push(destination);
    return this;
  }

  setZk(): this {
    const destination = this.payment.destinations[this.payment.destinations.length - 1];
    if (destination) {
      destination.isZk = true;
      destination.zkId = (this.crypto ?? globalThis.crypto).randomUUID();
    }
    return this;
  }

  setDescription(description: string): this {
    this.payment.description = description;
    return this;
  }

  addMetadata(key: string, value: string): this {
    const metadataMap: Record<string, unknown> = this.payment.metadata
      ? (JSON.parse(this.payment.metadata) as Record<string, unknown>)
      : {};
    metadataMap[key] = value;
    this.payment.metadata = JSON.stringify(metadataMap);
    return this;
  }

  setTtl(ttl: number): this {
    this.payment.ttl = ttl;
    return this;
  }

  setPlatformLogoUrl(platformLogoUrl: string): this {
    this.payment.platformLogoUrl = platformLogoUrl;
    return this;
  }

  build(): Payment {
    return this.payment;
  }
}
