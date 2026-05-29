# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

