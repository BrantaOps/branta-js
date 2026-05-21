import { Destination } from '../models/destination.js';
import { Payment } from '../models/payment.js';

export const destinationToApi = (destination: Destination): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    value: destination.value,
    primary: destination.isPrimary ?? false,
    zk: destination.isZk ?? false,
  };
  if (destination.type !== undefined) result['type'] = destination.type;
  if (destination.zkId !== undefined) result['zk_id'] = destination.zkId;
  return result;
};

export const destinationFromApi = (raw: Record<string, unknown>): Destination => {
  const destination: Destination = {
    value: String(raw['value'] ?? ''),
    isPrimary: Boolean(raw['primary'] ?? false),
    isZk: Boolean(raw['zk'] ?? false),
  };
  if (raw['type'] !== undefined && raw['type'] !== null) {
    destination.type = raw['type'] as Destination['type'];
  }
  if (raw['zk_id'] !== undefined && raw['zk_id'] !== null) {
    destination.zkId = String(raw['zk_id']);
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
  if (payment.btcPayServerPluginVersion !== undefined) {
    result['btc_pay_server_plugin_version'] = payment.btcPayServerPluginVersion;
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
  if (raw['btc_pay_server_plugin_version'] !== undefined && raw['btc_pay_server_plugin_version'] !== null) {
    payment.btcPayServerPluginVersion = String(raw['btc_pay_server_plugin_version']);
  }
  return payment;
};
