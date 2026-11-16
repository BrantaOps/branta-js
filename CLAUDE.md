# Branta JS SDK

TypeScript/ESM SDK published as `@branta-ops/branta`. Consumers (wallets, platforms, parent platforms) call `BrantaService` to look up or post payments to Branta's V2 API. `README.md` is the install, constructor, samples, and crypto guide.

## Behavior contract

What `verify` returns and how ERC-681 is parsed: [How verify works](https://developer.branta.pro/setup/send/how-verify-works). Which rails encrypt with what key: [Encryption](https://developer.branta.pro/setup/receive/encryption). Send handling is on [Send](https://developer.branta.pro/setup/send), and the type list on [Destination types](https://developer.branta.pro/destination-types). Do not restate them here. Change the docs first, then the SDK.

Invariants that break silently. Check them before you change `verify` or `addPayment`:

- A raw on-chain address (including `tb1` / `bcrt1` / bare `0x`) is `unknown` and does not GET.
- A swapped address is `tampered`. A status never throws.
- `uint256` is not bound. The token is `matchedDestinations[].type`, never the URI scheme.
- A logo-domain mismatch throws. Every other failure is a status.
- `addPayment` encrypts a copy and leaves the caller's `Payment` unchanged.
- Keep parity with every 4.x Branta SDK. A public method added or changed here is mirrored in each of them.

## JS specifics

- A missing crypto implementation throws `CryptoUnavailable` (`crypto_unavailable`). It is not a status.
- A caller `AbortSignal` cancel is not `incomplete`. A 30s HTTP timeout is.
- `Destination.id` is sent as `zk_id`. `zk: true` is always sent.
- `verify` parses first. Multi-value payloads (`branta_id` / `branta_secret`, `lightning=`, `ark=`, `sp=`) go through `QRParser` whether they came from a scan or a paste.
- `DestinationType` is only what `addPayment` accepts. It also includes `usdt_tron`, `usdt_ton`, `usdt_solana`, and `usdc_solana`. They can be posted but no URI verifies them, and they are not on the public Destination types page. There is no `usdc_ton`.
- Do not reintroduce `BrantaClientOptions`, `defaultApiKey`, `BrantaServerBaseUrl`, `QRParseException`, `Destination.zkId`, `Payment.btcPayServerPluginVersion`, or a two-argument `BrantaService` constructor.

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

## Conventions
- ESM-only (`"type": "module"` in `package.json`). Local imports must use `.js` extensions even from `.ts` files; Jest's `moduleNameMapper` strips them at test time.
- Public API is whatever `src/index.ts` exports. Do not add `BrantaClient`, `QRParser`, AES classes, `GuidSecretGenerator`, `QRParseException`, or `IncompleteError` to that list.
- Public names: `BrantaServiceOptions` is the constructor argument (`environment`, `apiKey`, `hmacSecret`, `crypto`, `fetchImpl`). `BrantaApiOptions` is per-call overrides. `BrantaEnvironment`.
- `BrantaService` takes one `BrantaServiceOptions` argument. Every public method accepts optional per-call `BrantaApiOptions`; respect that pattern when adding new methods.
