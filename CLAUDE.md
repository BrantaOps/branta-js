# Branta JS SDK

TypeScript/ESM port of the Branta SDK, published as `@branta-ops/branta`. Consumers (wallets, platforms, parent platforms) call `BrantaService` to look up or post payments to Branta's V2 API. Mirrors the .NET SDK at [github.com/BrantaOps/branta-dotnet](https://github.com/BrantaOps/branta-dotnet) and should be kept feature-parity with it.

## Package layout
- `src/index.ts` — shared exports (`BrantaServerBaseUrl`, `DestinationType`, `PrivacyMode`, options, exceptions, AES helpers).
- `src/v2/index.ts` — the V2 API surface exported as the `@branta-ops/branta/v2` subpath: `BrantaService`, `BrantaClient`, `PaymentBuilder`, `QRParser`, `GuidSecretGenerator`, plus models and interfaces.
- `src/v2/services/brantaService.ts` — orchestrates ZK encrypt/decrypt around HTTP calls. `brantaClient.ts` is the raw HTTP layer; do not call it directly from consumer code.
- `src/v2/classes/paymentBuilder.ts` — builder for `Payment` objects (`setDescription`, `addDestination`, `setZk`, `setTtl`).
- `src/classes/aesEncryption.ts` / `aesEncryptionService.ts` — the AES primitives shared with V2.
- `test/` mirrors `src/` (Jest with `ts-jest` ESM preset; test files end in `.test.ts`).

## Scripts
- `npm run build` — `tsc` emits ESM to `dist/`.
- `npm test` — Jest with coverage. Requires `--experimental-vm-modules` (already in the script).
- `npm run clean` — `rm -rf dist`.
- Release: `npm login`, `npm version major|minor|patch`, `npm publish`. `prepublishOnly` rebuilds.

## Key behaviors to preserve when editing the SDK
- **`privacy: 'strict'` is the default.** It forbids plain-text on-chain lookups (`getPayments` throws `BrantaPaymentException`, `getPaymentsByQrCode` returns an empty `PaymentsResult` with a populated `verifyUrl`) and forbids non-ZK destinations on `addPayment`. `'loose'` removes those restrictions.
- **`verifyUrl` is always returned**, even on a miss. Format: `{baseUrl}/v2/verify/{lookup}` plus a URL fragment built from per-destination encryption keys.
- **ZK destinations.** Bitcoin addresses are encrypted with a caller-supplied secret (random GUID via `GuidSecretGenerator`); hash-ZK types (bolt11, bolt12, ln_url, ln_address, ark, tether) are encrypted with a deterministic key derived from a normalized hash of the value, so the same input always produces the same lookup token. `addPayment` mutates `payment.destinations[*].value` to the encrypted form before POSTing.
- **Prefer `getPaymentsByQrCode`** for any QR-driven flow — it parses multi-value QR payloads (`branta_id` / `branta_secret` fragments) via `QRParser`. `getPayments` only handles a single destination string.
- **Never surface lookup failures to the user.** README documents the consumer contract: swallow errors and treat empty `payments` as "show nothing."

## Conventions
- ESM-only (`"type": "module"` in `package.json`). Local imports must use `.js` extensions even from `.ts` files; Jest's `moduleNameMapper` strips them at test time.
- Public API lives under `src/v2/*`; types outside `v2/` (`src/classes`, `src/enums`, `src/exceptions`) are shared primitives reused by V2.
- `BrantaServiceOptions` can be overridden per-call — every public method accepts an optional options parameter; respect that pattern when adding new methods.
- Keep parity with the .NET SDK: when adding or changing a public method here, mirror the change there (and vice versa).
