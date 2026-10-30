export const BrantaEnvironment = {
  Staging: 'Staging',
  Production: 'Production',
  Localhost: 'Localhost',
} as const;

export type BrantaEnvironment = (typeof BrantaEnvironment)[keyof typeof BrantaEnvironment];

export const BrantaEnvironmentUrls: Record<BrantaEnvironment, string> = {
  Staging: 'https://staging.guardrail.branta.pro',
  Production: 'https://guardrail.branta.pro',
  Localhost: 'http://localhost:3000',
};
