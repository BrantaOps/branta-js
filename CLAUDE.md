# Branta JS SDK

If you are implementing this SDK in a consumer project, see the **Integration Guide** section at the top of `README.md` — it covers integration types, recommended flows, and rules.

---

TypeScript/ESM port of the Branta SDK, published as `@branta-ops/branta`. Consumers (wallets, platforms, parent platforms) call `BrantaService` to look up or post payments to Branta's V2 API. Mirrors the .NET SDK at [github.com/BrantaOps/branta-dotnet](https://github.com/BrantaOps/branta-dotnet) and should be kept feature-parity with it.

## Package layout
- `src/index.ts` — shared exports (`BrantaServerBaseUrl`, `DestinationType`, options, exceptions, AES helpers).
- `src/v2/index.ts` — the V2 API surface exported as the `@branta-ops/branta/v2` subpath: `BrantaService`, `BrantaClient`, `PaymentBuilder`, `QRParser`, `GuidSecretGenerator`, plus models and interfaces.
- `src/v2/services/brantaService.ts` — orchestrates AES encrypt/decrypt around HTTP calls. `brantaClient.ts` is the raw HTTP layer; do not call it directly from consumer code.
- `src/v2/classes/paymentBuilder.ts` — builder for `Payment` objects (`setDescription`, `addDestination`, `setTtl`).
- `src/classes/aesEncryption.ts` / `aesEncryptionService.ts` — the AES primitives shared with V2.
- `test/` mirrors `src/` (Jest with `ts-jest` ESM preset; test files end in `.test.ts`).

## Scripts
- `npm run build` — `tsc` emits ESM to `dist/`.
- `npm test` — Jest with coverage. Requires `--experimental-vm-modules` (already in the script).
- `npm run clean` — `rm -rf dist`.
- Release: `npm login`, `npm version major|minor|patch`, `npm publish`. `prepublishOnly` rebuilds.

## Key behaviors to preserve when editing the SDK
- **Unencrypted destinations are not supported.** `verify` is the only lookup: QR scan and clipboard paste use the same call. A raw on-chain address (including testnet `tb1` / `bcrt1`) returns an empty `PaymentsResult` with a populated `verifyUrl` and does not GET. `addPayment` encrypts every destination; types that cannot be encrypted throw.
- **`verifyUrl` is always returned**, even on a miss. Format: `{baseUrl}/v2/verify/{lookup}` plus a URL fragment built from per-destination encryption keys.
- **Encryption.** Bitcoin addresses are encrypted with a caller-supplied secret (random UUID via `GuidSecretGenerator`); bolt11, Ark, and silent payments are encrypted with a key derived from a normalized hash of the value, so the same input always produces the same lookup token. `addPayment` mutates `payment.destinations[*].value` to the encrypted form before POSTing. Guardrail still receives `zk: true` and `zk_id` on each destination.
- **`verify` parses first.** Multi-value payloads (`branta_id` / `branta_secret`, `lightning=`, `ark=`, `sp=`) go through `QRParser` whether they came from a scan or a paste.
- **Never surface lookup failures to the user.** README documents the consumer contract: swallow errors and treat empty `payments` as "show nothing."

## Conventions
- ESM-only (`"type": "module"` in `package.json`). Local imports must use `.js` extensions even from `.ts` files; Jest's `moduleNameMapper` strips them at test time.
- Public API lives under `src/v2/*`; types outside `v2/` (`src/classes`, `src/enums`, `src/exceptions`) are shared primitives reused by V2.
- `BrantaServiceOptions` can be overridden per-call — every public method accepts an optional options parameter; respect that pattern when adding new methods.
- Keep parity with the .NET SDK: when adding or changing a public method here, mirror the change there (and vice versa).
