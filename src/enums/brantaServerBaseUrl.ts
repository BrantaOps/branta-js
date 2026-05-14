export const BrantaServerBaseUrl = {
  Staging: 'Staging',
  Production: 'Production',
  Localhost: 'Localhost',
} as const;

export type BrantaServerBaseUrl = (typeof BrantaServerBaseUrl)[keyof typeof BrantaServerBaseUrl];

export const BrantaServerBaseUrls: Record<BrantaServerBaseUrl, string> = {
  Staging: 'https://staging.guardrail.branta.pro',
  Production: 'https://guardrail.branta.pro',
  Localhost: 'http://localhost:3000',
};
