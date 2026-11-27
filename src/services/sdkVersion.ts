/**
 * Internal. Must equal `version` in package.json; `test/services/brantaClient.test.ts` fails if it drifts.
 * Not exported from `src/index.ts`.
 */
export const SDK_VERSION = '4.4.0';

/** Value of the `X-Branta-SDK` header sent on `POST /v2/payments`. */
export const SDK_HEADER_VALUE = `js/${SDK_VERSION}`;
