# Branta JS SDK

TypeScript/ESM SDK published as `@branta-ops/branta`. Consumers (wallets, platforms, parent platforms) call `BrantaService` to look up or post payments to Branta. `README.md` is the install, constructor, samples, and crypto guide.

## Behavior contract

What `verify` returns and how ERC-681 is parsed: [Status rules](https://developer.branta.pro/setup/send/status-rules). Which rails encrypt with what key: [Encryption](https://developer.branta.pro/setup/receive/encryption). Send handling is on [Send](https://developer.branta.pro/setup/send), and the type list on [Destination types](https://developer.branta.pro/destination-types). Do not restate them here. Change the docs first, then the SDK.

Invariants that break silently. Check them before you change `verify` or `addPayment`:

- A raw on-chain address (including `tb1` / `bcrt1` / bare `0x`) is `unknown` and does not GET.
- A swapped address is `tampered`. `unknown`, `tampered`, and `incomplete` are returned, never thrown.
- The token is `matchedDestinations[].type`, never the URI scheme.
- A logo-domain mismatch throws. Every other lookup failure is a status.
- `addPayment` encrypts a copy and leaves the caller's `Payment` unchanged.
- The payment POST sends `X-Branta-SDK: <language>/<version>`. A GET never does. [SDK header](https://developer.branta.pro/tech/api/receive#sdk-header)
- Keep parity with every 4.x Branta SDK. A public method added or changed here is mirrored in each of them.

## JS specifics

- A missing crypto implementation throws `CryptoUnavailable` (`crypto_unavailable`). It is not a status.
- A caller `AbortSignal` cancel is not `incomplete`. A 30s HTTP timeout is.
- `Destination.id` is sent as `zk_id`. `zk: true` is always sent.
- `verify` parses first. Multi-value payloads (`branta_id` / `branta_secret`, `lightning=`, `ark=`, `sp=`) go through `QRParser` whether they came from a scan or a paste.
- `DestinationType` is only what `addPayment` accepts. It also includes `usdt_tron`, `usdt_ton`, `usdt_solana`, and `usdc_solana`. They can be posted but no URI verifies them, and they are not on the public Destination types page. There is no `usdc_ton`.
- `setBrand` is the builder method and `brand` is the wire field. `setChildPlatform` and `Payment.childPlatform` stay only as deprecated aliases: `setChildPlatform` delegates to `setBrand`, and an effective brand is `brand` ?? `childPlatform`. Never send `child_platform`. Parsing accepts either (`brand` wins) and mirrors the value into `childPlatform`.
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
- Release: `npm login`, `npm version major|minor|patch` (bumps `package.json` and creates the `vX.Y.Z` tag locally; the `SDK_VERSION` test in `test/services/brantaClient.test.ts` fails until `src/services/sdkVersion.ts` matches the new version), `npm publish`, then push the tag with `git push origin vX.Y.Z`. `prepublishOnly` rebuilds.

## Conventions
- ESM-only (`"type": "module"` in `package.json`). Local imports must use `.js` extensions even from `.ts` files; Jest's `moduleNameMapper` strips them at test time.
- Public API is whatever `src/index.ts` exports. Do not add `BrantaClient`, `QRParser`, AES classes, `GuidSecretGenerator`, `QRParseException`, or `IncompleteError` to that list.
- `BrantaService` takes one `BrantaServiceOptions` argument (`environment`, `apiKey`, `hmacSecret`, `crypto`, `fetchImpl`). `BrantaApiOptions` holds per-call overrides, and every public method accepts it as an optional argument; respect that pattern when adding new methods. `BrantaEnvironment` selects the environment.
