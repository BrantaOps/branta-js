import { DestinationType } from '../../enums/destinationType.js';
import { Destination } from '../models/destination.js';
import { Payment } from '../models/payment.js';

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

export const paymentToApi = (payment: Payment): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    destinations: payment.destinations.map(destinationToApi),
  };
  if (payment.description !== undefined) result['description'] = payment.description;
  if (payment.createdDate !== undefined) result['created_at'] = payment.createdDate;
  if (payment.ttl !== undefined) result['ttl'] = payment.ttl;
  if (payment.metadata !== undefined) result['metadata'] = payment.metadata;
  if (payment.platform !== undefined) result['platform'] = payment.platform;
  if (payment.platformLogoUrl !== undefined) result['platform_logo_url'] = payment.platformLogoUrl;
  if (payment.platformLogoLightUrl !== undefined) result['platform_logo_light_url'] = payment.platformLogoLightUrl;
  if (payment.childPlatform !== undefined) {
    const cp: Record<string, unknown> = {};
    if (payment.childPlatform.name !== undefined) cp['name'] = payment.childPlatform.name;
    if (payment.childPlatform.logoUrl !== undefined) cp['logo_url'] = payment.childPlatform.logoUrl;
    if (payment.childPlatform.logoLightUrl !== undefined) cp['logo_light_url'] = payment.childPlatform.logoLightUrl;
    result['child_platform'] = cp;
  }
  return result;
};

export const paymentFromApi = (raw: Record<string, unknown>): Payment => {
  const destinationsRaw = Array.isArray(raw['destinations']) ? (raw['destinations'] as Record<string, unknown>[]) : [];
  const payment: Payment = {
    destinations: destinationsRaw.map(destinationFromApi),
  };
  if (raw['description'] !== undefined && raw['description'] !== null) payment.description = String(raw['description']);
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
  if (raw['child_platform'] !== undefined && raw['child_platform'] !== null) {
    const cp = raw['child_platform'] as Record<string, unknown>;
    const childPlatform: Payment['childPlatform'] = {};
    if (cp['name'] !== undefined && cp['name'] !== null) childPlatform.name = String(cp['name']);
    if (cp['logo_url'] !== undefined && cp['logo_url'] !== null) childPlatform.logoUrl = String(cp['logo_url']);
    if (cp['logo_light_url'] !== undefined && cp['logo_light_url'] !== null) {
      childPlatform.logoLightUrl = String(cp['logo_light_url']);
    }
    payment.childPlatform = childPlatform;
  }
  return payment;
};
