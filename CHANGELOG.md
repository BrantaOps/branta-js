# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.1] - 2026-11-13

### Fixed
- HTTP calls (GET, POST, health-check) use a 30s wall-clock timeout. A verify GET that times out returns `incomplete`. Caller `AbortSignal` cancel still surfaces as abort, not `incomplete`.

## [4.3.0] - 2026-11-12

### Added
- Multi-rail stablecoin destination types for `addPayment` / `verify`: `usdt_ethereum`, `usdc_ethereum`, `usdt_bsc`, `usdc_bsc`, `usdt_tron`, `usdt_ton`, `usdt_solana`, `usdc_solana`.
- Chain URI schemes `eth:`, `bsc:`, `tron:`, `ton:`, and `sol:` follow the existing `pol:` pattern: secret-key encrypt, match-if-any within the scheme family, token on the matched destination type. Bare addresses remain `unknown`.

### Notes
- `usdc_ton` is deferred until a platform names a concrete TON USDC jetton.
- Rail family helpers stay package-internal; the public entry still exports `DestinationType` for consumers.

## [4.2.0] - 2026-11-10

### Added
- `DestinationType.UsdcPolygon` for Polygon USDC. Same secret-key encrypt / `pol:` verify path as `usdt_polygon`. Token is the destination type on the payment; `pol:` remains the Polygon EVM scheme for both.
- `verify()` `match` includes `matchedDestinations`: the rails this scan bound (plaintext + `type`). Wallets should send from that list instead of filtering `payments[].destinations`.

### Changed
- `POLYGON_EVM_DESTINATION_TYPES` is `{usdt_polygon, usdc_polygon}`. `verify()` of a `pol:` URI binds any family member whose decrypted address matches (match-if-any).
- `pol:` parsing no longer stamps a token `DestinationType` on the QR address. The scheme maps to the Polygon EVM family for verify; the token still comes from the matched payment destination.

## [4.1.0] - 2026-11-09

### Added
- `DestinationType.UsdtPolygon` for Polygon USDT. `addPayment` encrypts the recipient with a random secret (same pattern as bitcoin). `verify()` parses `pol:` URIs with `branta_id` / `branta_secret`; other query params (`value`, `currency`, `user`) are ignored for binding. A bare `0x` address is `unknown`. EVM address compare is case-insensitive.

### Fixed
- `verify()` swap-checks only the secret-key rail that matches the QR type, so a payment with both bitcoin and `usdt_polygon` no longer returns `tampered` for a valid single-rail QR.

## [4.0.5] - 2026-11-01

### Fixed
- `verifyUrl` fragment names and values are percent-encoded, so a crafted id or secret cannot add parameters.
- `verify()` of a bolt11, Ark, or silent payment is `tampered` when the decrypted plaintext is not the scanned value. Case differences still match.

## [4.0.4] - 2026-11-01

### Fixed
- `addPayment` encrypts a copy of the caller's `Payment`. A failed post no longer leaves that object encrypted, so retrying the same instance does not wrap a bitcoin address a second time or reject a bolt11, Ark, or silent-payment destination.

## [4.0.3] - 2026-11-01

### Changed
- `setDescription` writes encrypted `metadata.description`. The SDK does not POST or GET Guardrail's plaintext `description` field. After metadata decrypt, `payment.description` is lifted from `metadata.description` for wallets.

## [4.0.2] - 2026-10-31

### Fixed
- `verify()` of a bolt11, Ark, or silent payment is `unknown` unless a destination of that type decrypts. A Guardrail hit is not a match by itself.

## [4.0.1] - 2026-10-31

### Added
- `verify()` status `incomplete` when the lookup does not finish (5xx, 429, or no network). A 404 is still `unknown`.

## [4.0.0] - 2026-10-29

### Removed
- **BREAKING:** `PrivacyMode` and the `privacy` client option. The SDK encrypts every destination: on-chain lookups need `branta_id` / `branta_secret`; bolt11, Ark, and silent payments still resolve from the value.
- **BREAKING:** `PaymentBuilder.setZk()` and `Destination.isZk`.
- **BREAKING:** `getPayments` and `getPaymentsByQrCode`. Wallets call `verify(input)` for both QR scan and clipboard paste.
- **BREAKING:** The `@branta-ops/branta/v2` subpath. Import from `@branta-ops/branta`. `BrantaClient`, `QRParser`, `AesEncryption`, `AesEncryptionService`, `GuidSecretGenerator`, and the `IBranta*` / `IAesEncryption` / `ISecretGenerator` types are no longer exported. `getDefaultValue` is gone.
- **BREAKING:** `verify()` returns `{ status, verifyUrl }` with `status` of `match`, `unknown`, or `tampered`. A swapped address is `tampered`, not a thrown exception. `payments` is present only on `match`. `PaymentsResult` and `BrantaPaymentExceptionReason.Tampered` are gone.
- **BREAKING:** `DestinationType.Bolt12`, `LnUrl`, `TetherAddress`, and `LnAddress`. `DestinationType` is the set of types `addPayment` accepts: bitcoin, bolt11, Ark, and silent payments.
- **BREAKING:** `BrantaClientOptions` is `BrantaApiOptions`. `baseUrl` is `environment`; `BrantaServerBaseUrl` / `BrantaServerBaseUrls` are `BrantaEnvironment` / `BrantaEnvironmentUrls`; `defaultApiKey` is `apiKey`.
- **BREAKING:** `QRParseException`. Nothing threw it.
- **BREAKING:** `Payment.btcPayServerPluginVersion`.
- **BREAKING:** `Destination.zkId` is `Destination.id`. Guardrail still receives `zk_id`.
- **BREAKING:** `new BrantaService(apiOptions, { crypto })` is `new BrantaService({ ...apiOptions, crypto })`. `BrantaServiceOptions` is the constructor argument (`environment`, `apiKey`, `hmacSecret`, `crypto`, `fetchImpl`). Per-call overrides stay `BrantaApiOptions`.

### Fixed
- `verify()` of a `bitcoin:` URI with `branta_id` / `branta_secret` and no payable destination is `unknown`. Finding the record is not a match.

### Changed
- `prepublishOnly` runs `clean` before `build`, so leftover files from deleted source cannot ship in the tarball.
- README is the JavaScript (install, constructor, samples, crypto). Product rules live in the [developer docs](https://developer.branta.pro).
- Source layout no longer uses a `v2` directory. Guardrail HTTP paths remain `/v2/...`.
- A bolt11 / Ark / silent-payment miss no longer retries the raw string.
- A raw on-chain address is not looked up. `verify` returns empty for those destinations, including testnet `tb1` / `bcrt1`.
- `addPayment` infers `bitcoin_address` from the value when `type` is omitted, so `addDestination(value)` still encrypts.
- `destinationToApi` always sends `zk: true` (Guardrail wire field).

## [[3.2.5](https://github.com/BrantaOps/branta-js/compare/v3.2.4...v3.2.5)] - 2026-10-29

### Fixed
- `getPaymentsByQrCode` returns a payment only when every payable instruction in the QR matches a decrypted destination on that record. A swapped address with a rewritten `branta_secret`, an added `lightning=`, `ark=`, or `sp=` leg, or a conflicting `bc=` / `tb=` no longer comes back as verified. `bolt12`, `lno=`, `pay=`, and LNURL return no payments ([#78](https://github.com/BrantaOps/branta-js/pull/78)).
- A `Tampered` address mismatch no longer prints the QR address and the decrypted address to the console.

## [[3.2.4](https://github.com/BrantaOps/branta-js/compare/v3.2.3...v3.2.4)] - 2026-10-28

### Fixed
- `getPaymentsByQrCode` strips the same control characters as `new URL()` — tab, line feed, and carriage return anywhere, plus leading and trailing C0 controls — before it types a QR destination. A control byte inside `bitcoin:` no longer leaves the address untyped, so a swapped address still throws `Tampered`.

## [[3.2.3](https://github.com/BrantaOps/branta-js/compare/v3.2.2...v3.2.3)] - 2026-10-28

### Added
- Recognize signet and regtest Ark addresses (`tark1`) as `ark_address`, alongside mainnet `ark1`. Lookup and registration treat them the same way as `ark1`.

## [[3.2.2](https://github.com/BrantaOps/branta-js/compare/v3.2.1...v3.2.2)] - 2026-09-30

### Fixed
- Fixed a same-origin validation gap: if the first payment in a `getPayments` response had no `platformLogoUrl`, validation silently stopped checking every later payment's logo URLs entirely. Logo-URL checks now run independently per payment, and now also cover `platformLogoLightUrl`, `parentPlatform.logoUrl`/`logoLightUrl`, and `childPlatform.logoUrl`/`logoLightUrl` (previously only `platformLogoUrl` was checked) ([#70](https://github.com/BrantaOps/branta-js/pull/70))

## [[3.2.1](https://github.com/BrantaOps/branta-js/compare/v3.2.0...v3.2.1)] - 2026-08-24

### Fixed
- `getPaymentsByQrCode` now verifies that the plaintext Bitcoin address parsed from a scanned QR code matches the address decrypted via `branta_id`/`branta_secret`, throwing `BrantaPaymentException` with `reason: BrantaPaymentExceptionReason.Tampered` on mismatch. Closes a gap where an attacker could swap the visible address in a `bitcoin:` URI while leaving a legitimate, verified `branta_id`/`branta_secret` pair untouched ([#66](https://github.com/BrantaOps/branta-js/pull/66))
- Distinguish encryption being unavailable in the current environment (e.g. no Web Crypto API) from an ordinary key mismatch — now throws `BrantaPaymentException` with `reason: BrantaPaymentExceptionReason.CryptoUnavailable` instead of silently leaving the destination encrypted

## [[3.2.0](https://github.com/BrantaOps/branta-js/compare/v3.1.4...v3.2.0)] - 2026-07-17

### Added
- Child platform flow support ([#62](https://github.com/BrantaOps/branta-js/pull/62))

## [[3.1.4](https://github.com/BrantaOps/branta-js/compare/v3.1.3...v3.1.4)] - 2026-06-18

### Added
- Silent payment destination support ([#51](https://github.com/BrantaOps/branta-js/pull/51))
- Encrypted metadata support on payment destinations ([#55](https://github.com/BrantaOps/branta-js/pull/55))
- Injectable crypto provider for non-secure-context environments ([#56](https://github.com/BrantaOps/branta-js/pull/56))

## [[3.1.3](https://github.com/BrantaOps/branta-js/compare/v3.1.2...v3.1.3)] - 2026-05-29

### Added
- Parent platform model included in payment response ([#46](https://github.com/BrantaOps/branta-js/pull/46))
- Integration tests and expanded test coverage ([#47](https://github.com/BrantaOps/branta-js/pull/47))
- Integration guide in README ([#48](https://github.com/BrantaOps/branta-js/pull/48))

## [[3.1.2](https://github.com/BrantaOps/branta-js/compare/v3.1.1...v3.1.2)] - 2026-05-18

### Fixed
- Allow encrypted bitcoin address lookups in strict mode when a secret is provided ([#42](https://github.com/BrantaOps/branta-js/pull/42))

## [[3.1.1](https://github.com/BrantaOps/branta-js/compare/v3.1.0...v3.1.1)] - 2026-05-18

### Changed
- Release bump only ([#40](https://github.com/BrantaOps/branta-js/pull/40))

## [[3.1.0](https://github.com/BrantaOps/branta-js/compare/v3.0.4...v3.1.0)] - 2026-05-15

### Changed
- Return both the list of payments and the verify URL whether or not a payment is found ([#39](https://github.com/BrantaOps/branta-js/pull/39))
- Clean up README

## [[3.0.4](https://github.com/BrantaOps/branta-js/compare/v3.0.3...v3.0.4)] - 2026-05-14

### Fixed
- Stop throwing a decrypt-failure exception for related payment destinations

## [[3.0.3](https://github.com/BrantaOps/branta-js/compare/v3.0.2...v3.0.3)] - 2026-05-14

### Changed
- Refactor SDK structure to match the .NET SDK ([#35](https://github.com/BrantaOps/branta-js/pull/35))

## [[3.0.2](https://github.com/BrantaOps/branta-js/compare/v3.0.1...v3.0.2)] - 2026-05-12

### Fixed
- Properly convert snake_case to camelCase in API responses ([#33](https://github.com/BrantaOps/branta-js/pull/33))

### Changed
- README updates

## [[3.0.1](https://github.com/BrantaOps/branta-js/compare/v3.0.0...v3.0.1)] - 2026-05-11

### Changed
- Move version-specific exports under `/v2` and clean up the root index

## [[3.0.0](https://github.com/BrantaOps/branta-js/compare/v2.0.0...v3.0.0)] - 2026-05-11

### Changed
- **BREAKING:** Update methods to match .NET SDK v3 ([#27](https://github.com/BrantaOps/branta-js/pull/27))

### Added
- Missing tests and supporting code ([#27](https://github.com/BrantaOps/branta-js/pull/27))

## [[2.0.0](https://github.com/BrantaOps/branta-js/compare/v1.0.2...v2.0.0)] - 2026-04-15

### Added
- `zkOnly` option on `BrantaConfig` ([#22](https://github.com/BrantaOps/branta-js/pull/22))

### Changed
- **BREAKING:** Rename `zkOnly` option to `privacy` and replace boolean with an enum ([#22](https://github.com/BrantaOps/branta-js/pull/22))
- Update README examples

## [[1.0.2](https://github.com/BrantaOps/branta-js/compare/v1.0.0...v1.0.2)] - 2026-04-14

### Added
- `platformLogoLightUrl` field ([#19](https://github.com/BrantaOps/branta-js/pull/19))

## [[1.0.1](https://github.com/BrantaOps/branta-js/compare/v1.0.0...v1.0.2)] - 2026-04-14

### Added
- `ln_address` and `ark_address` destination options ([#16](https://github.com/BrantaOps/branta-js/pull/16))

## [[1.0.0](https://github.com/BrantaOps/branta-js/compare/v0.0.9...v1.0.0)] - 2026-03-27

### Added
- Destination type on get and post payments ([#11](https://github.com/BrantaOps/branta-js/pull/11))
- SDK parity work with sibling SDKs ([#12](https://github.com/BrantaOps/branta-js/pull/12))
- GitHub CI workflow ([#10](https://github.com/BrantaOps/branta-js/pull/10))

### Fixed
- Property name casing ([#13](https://github.com/BrantaOps/branta-js/pull/13))

## [[0.0.9](https://github.com/BrantaOps/branta-js/compare/v0.0.8...v0.0.9)] - 2026-03-25

### Fixed
- Prevent invalid domain values for platform website URL ([#9](https://github.com/BrantaOps/branta-js/pull/9))

## [[0.0.8](https://github.com/BrantaOps/branta-js/compare/v0.0.7...v0.0.8)] - 2026-03-17

### Fixed
- Preserve `+` characters in query params

## [[0.0.7](https://github.com/BrantaOps/branta-js/compare/v0.0.6...v0.0.7)] - 2026-03-17

### Fixed
- URL encoding

## [[0.0.6](https://github.com/BrantaOps/branta-js/compare/v0.0.5...v0.0.6)] - 2026-03-17

### Fixed
- Strip query params in QR scan ([#6](https://github.com/BrantaOps/branta-js/pull/6))

## [[0.0.5](https://github.com/BrantaOps/branta-js/compare/v0.0.4...v0.0.5)] - 2026-03-17

### Changed
- SDK now builds the verify URL ([#5](https://github.com/BrantaOps/branta-js/pull/5))

## [[0.0.4](https://github.com/BrantaOps/branta-js/compare/v0.0.3...v0.0.4)] - 2026-03-17

### Added
- QR parsing ([#3](https://github.com/BrantaOps/branta-js/pull/3))

### Changed
- README updates

## [[0.0.3](https://github.com/BrantaOps/branta-js/releases/tag/v0.0.3)] - 2026-02-24

### Added
- Initial release
- TypeScript conversion
- Request timeout option
- Parent platform HMAC signing support
- README quick-start guide
- MIT license

