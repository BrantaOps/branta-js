# Branta JS SDK

If you are implementing this SDK in a consumer project: product rules (send vs receive, `match` / `unknown` / `tampered`, parent platforms) live in the [developer docs](https://developer.branta.pro). `README.md` is the JavaScript — install, constructor, samples, and crypto.

---

TypeScript/ESM port of the Branta SDK, published as `@branta-ops/branta`. Consumers (wallets, platforms, parent platforms) call `BrantaService` to look up or post payments to Branta's V2 API. Mirrors the .NET SDK at [github.com/BrantaOps/branta-dotnet](https://github.com/BrantaOps/branta-dotnet) and should be kept feature-parity with it.

## Package layout
- `src/index.ts` — the public package entry (`BrantaService`, `PaymentBuilder`, `DestinationType`, options, exceptions, `createNobleCryptoProvider`).
- `src/services/brantaService.ts` — orchestrates AES encrypt/decrypt around HTTP calls. `brantaClient.ts` is the raw HTTP layer; do not export or call it from consumer code.
- `src/classes/paymentBuilder.ts` — builder for `Payment` objects (`setDescription`, `addDestination`, `setTtl`).
- `src/classes/aesEncryption.ts` / `aesEncryptionService.ts` — internal AES primitives.
- `test/` mirrors `src/` (Jest with `ts-jest` ESM preset; test files end in `.test.ts`).

## Scripts
- `npm run build` — `tsc` emits ESM to `dist/`.
- `npm test` — Jest with coverage. Requires `--experimental-vm-modules` (already in the script).
- `npm run clean` — `rm -rf dist`.
- Release: `npm login`, `npm version major|minor|patch`, `npm publish`. `prepublishOnly` rebuilds.

## Key behaviors to preserve when editing the SDK
- **Unencrypted destinations are not supported.** `verify` is the only lookup: QR scan and clipboard paste use the same call. A raw on-chain address (including testnet `tb1` / `bcrt1`) is `unknown` and does not GET. `addPayment` encrypts every destination; types that cannot be encrypted throw.
- **`DestinationType` is only what `addPayment` accepts:** `bitcoin_address`, `bolt11`, `ark_address`, `silent_payment`. BIP21 extras this SDK cannot encrypt (`lno`, `pay`, non-bolt11 `lightning`) make `verify()` return `unknown`; they are not destination types.
- **`verify()` returns `VerifyResult`.** `match` includes `payments` and `verifyUrl`. `unknown`, `tampered`, and `incomplete` include only `verifyUrl`. Do not throw for a swapped address. A 404 is `unknown`. 5xx, 429, and no network are `incomplete`. `CryptoUnavailable` still throws. `branta_id` / `branta_secret` with no payable destination is `unknown`, not `match`.
- **`verifyUrl` is always returned.** Format: `{apiOrigin}/v2/verify/{lookup}` plus a URL fragment built from per-destination encryption keys on `match`.
- **Encryption.** Bitcoin addresses are encrypted with a caller-supplied secret (random UUID via `GuidSecretGenerator`); bolt11, Ark, and silent payments are encrypted with a key derived from a normalized hash of the value, so the same input always produces the same lookup token. `addPayment` mutates `payment.destinations[*].value` to the encrypted form before POSTing. Guardrail still receives `zk: true` and `zk_id` on each destination (`Destination.id` in JS).
- **Public names.** `BrantaServiceOptions` is the constructor argument (`environment`, `apiKey`, `hmacSecret`, `crypto`, `fetchImpl`). `BrantaApiOptions` is per-call overrides. `BrantaEnvironment`. Do not reintroduce `BrantaClientOptions`, `defaultApiKey`, `BrantaServerBaseUrl`, `QRParseException`, `Destination.zkId`, `Payment.btcPayServerPluginVersion`, or a two-argument `BrantaService` constructor.
- **`verify` parses first.** Multi-value payloads (`branta_id` / `branta_secret`, `lightning=`, `ark=`, `sp=`) go through `QRParser` whether they came from a scan or a paste.
- **Never surface `unknown` or thrown errors to the user.** `tampered` is the exception: warn, do not show a verified card.

## Conventions
- ESM-only (`"type": "module"` in `package.json`). Local imports must use `.js` extensions even from `.ts` files; Jest's `moduleNameMapper` strips them at test time.
- Public API is whatever `src/index.ts` exports. Do not add `BrantaClient`, `QRParser`, AES classes, `GuidSecretGenerator`, `QRParseException`, or `IncompleteError` to that list.
- `BrantaService` takes one `BrantaServiceOptions` argument. Every public method accepts optional per-call `BrantaApiOptions`; respect that pattern when adding new methods.
- Keep parity with the .NET SDK: when adding or changing a public method here, mirror the change there (and vice versa).
