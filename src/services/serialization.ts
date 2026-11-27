import { DestinationType } from '../enums/destinationType.js';
import { Destination } from '../models/destination.js';
import { Payment } from '../models/payment.js';
import { Platform } from '../models/platform.js';

const destinationTypes = new Set<string>(Object.values(DestinationType));

export const destinationToApi = (destination: Destination): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    value: destination.value,
    primary: destination.isPrimary ?? false,
    zk: true,
  };
  if (destination.type !== undefined) result['type'] = destination.type;
  if (destination.id !== undefined) result['zk_id'] = destination.id;
  if (destination.encryptedDek !== undefined) result['encrypted_dek'] = destination.encryptedDek;
  return result;
};

export const destinationFromApi = (raw: Record<string, unknown>): Destination => {
  const destination: Destination = {
    value: String(raw['value'] ?? ''),
    isPrimary: Boolean(raw['primary'] ?? false),
  };
  // Guardrail `zk: false` is a leftover unencrypted row — do not try to decrypt it.
  if (!Boolean(raw['zk'] ?? false)) {
    destination.isEncrypted = false;
  }
  if (typeof raw['type'] === 'string' && destinationTypes.has(raw['type'])) {
    destination.type = raw['type'] as DestinationType;
  }
  if (raw['zk_id'] !== undefined && raw['zk_id'] !== null) {
    destination.id = String(raw['zk_id']);
  }
  if (raw['encrypted_dek'] !== undefined && raw['encrypted_dek'] !== null) {
    destination.encryptedDek = String(raw['encrypted_dek']);
  }
  return destination;
};

/** `brand` if set, otherwise the deprecated `childPlatform`. */
export const effectiveBrand = (payment: Payment): Platform | undefined => payment.brand ?? payment.childPlatform;

export const paymentToApi = (payment: Payment): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    destinations: payment.destinations.map(destinationToApi),
  };
  if (payment.createdDate !== undefined) result['created_at'] = payment.createdDate;
  if (payment.ttl !== undefined) result['ttl'] = payment.ttl;
  if (payment.metadata !== undefined) result['metadata'] = payment.metadata;
  if (payment.platform !== undefined) result['platform'] = payment.platform;
  if (payment.platformLogoUrl !== undefined) result['platform_logo_url'] = payment.platformLogoUrl;
  if (payment.platformLogoLightUrl !== undefined) result['platform_logo_light_url'] = payment.platformLogoLightUrl;
  const brand = effectiveBrand(payment);
  if (brand !== undefined) {
    const b: Record<string, unknown> = {};
    if (brand.name !== undefined) b['name'] = brand.name;
    if (brand.logoUrl !== undefined) b['logo_url'] = brand.logoUrl;
    if (brand.logoLightUrl !== undefined) b['logo_light_url'] = brand.logoLightUrl;
    result['brand'] = b;
  }
  return result;
};

export const paymentFromApi = (raw: Record<string, unknown>): Payment => {
  const destinationsRaw = Array.isArray(raw['destinations']) ? (raw['destinations'] as Record<string, unknown>[]) : [];
  const payment: Payment = {
    destinations: destinationsRaw.map(destinationFromApi),
  };
  if (raw['created_at'] !== undefined && raw['created_at'] !== null) payment.createdDate = String(raw['created_at']);
  if (raw['ttl'] !== undefined && raw['ttl'] !== null) payment.ttl = Number(raw['ttl']);
  if (raw['metadata'] !== undefined && raw['metadata'] !== null) payment.metadata = String(raw['metadata']);
  if (raw['platform'] !== undefined && raw['platform'] !== null) payment.platform = String(raw['platform']);
  if (raw['platform_logo_url'] !== undefined && raw['platform_logo_url'] !== null) {
    payment.platformLogoUrl = String(raw['platform_logo_url']);
  }
  if (raw['platform_logo_light_url'] !== undefined && raw['platform_logo_light_url'] !== null) {
    payment.platformLogoLightUrl = String(raw['platform_logo_light_url']);
  }
  if (raw['parent_platform'] !== undefined && raw['parent_platform'] !== null) {
    const pp = raw['parent_platform'] as Record<string, unknown>;
    const parentPlatform: Payment['parentPlatform'] = {};
    if (pp['name'] !== undefined && pp['name'] !== null) parentPlatform.name = String(pp['name']);
    if (pp['logo_url'] !== undefined && pp['logo_url'] !== null) parentPlatform.logoUrl = String(pp['logo_url']);
    if (pp['logo_light_url'] !== undefined && pp['logo_light_url'] !== null) {
      parentPlatform.logoLightUrl = String(pp['logo_light_url']);
    }
    payment.parentPlatform = parentPlatform;
  }
  // `brand` wins over the deprecated `child_platform` alias. Mirror it into the deprecated field.
  const rawBrand = raw['brand'] ?? raw['child_platform'];
  if (rawBrand !== undefined && rawBrand !== null) {
    const bp = rawBrand as Record<string, unknown>;
    const brand: Platform = {};
    if (bp['name'] !== undefined && bp['name'] !== null) brand.name = String(bp['name']);
    if (bp['logo_url'] !== undefined && bp['logo_url'] !== null) brand.logoUrl = String(bp['logo_url']);
    if (bp['logo_light_url'] !== undefined && bp['logo_light_url'] !== null) {
      brand.logoLightUrl = String(bp['logo_light_url']);
    }
    payment.brand = brand;
    payment.childPlatform = { ...brand };
  }
  return payment;
};

const parseMetadataMap = (metadata: string | undefined): Record<string, unknown> => {
  if (metadata === undefined || metadata === '') return {};
  try {
    const parsed = JSON.parse(metadata);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // opaque string
  }
  return {};
};

export const foldDescriptionIntoMetadata = (payment: Payment): void => {
  if (payment.description === undefined || payment.description === '') return;
  const metadataMap = parseMetadataMap(payment.metadata);
  if (metadataMap['description'] === undefined) {
    metadataMap['description'] = payment.description;
  }
  payment.metadata = JSON.stringify(metadataMap);
  payment.description = undefined;
};

export const liftDescriptionFromMetadata = (payment: Payment): void => {
  const description = parseMetadataMap(payment.metadata)['description'];
  if (typeof description === 'string') payment.description = description;
};
