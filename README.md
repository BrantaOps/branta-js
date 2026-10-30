# @branta-ops/branta

JavaScript SDK for [Branta](https://developer.branta.pro). ESM only.

Wallets call `verify()`. Platforms call `addPayment()`. What to show on `match`, `unknown`, and `tampered` — and how parent platforms work — is in the [developer docs](https://developer.branta.pro). This README is the JavaScript.

If you are an agent: follow the docs for product rules, then this file for package names and samples.

## Install

```bash
npm i @branta-ops/branta
```

## Wallet

```ts
import { BrantaEnvironment, BrantaService } from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production, // Staging everywhere else
});

const result = await service.verify(input); // scanned QR or pasted text

switch (result.status) {
  case "match":
    // Show the card for result.payments[0]. Link it to result.verifyUrl.
    break;
  case "unknown":
    // Not in Branta — show nothing.
    break;
  case "tampered":
    // Destination was altered. Warn. Do not show a verified card.
    break;
}
```

On-chain Bitcoin needs a `bitcoin:` URI with `branta_id` / `branta_secret`. bolt11, Ark, and silent payments resolve from the value. A bare address is `unknown`.

Missing crypto or a network failure throws. Do not treat that as `unknown`.

## Platform

```ts
import {
  BrantaEnvironment,
  BrantaService,
  DestinationType,
  PaymentBuilder,
} from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  apiKey: "<api-key>",
});

const payment = new PaymentBuilder()
  .setDescription("Invoice #12345")
  .addDestination("bc1q…", DestinationType.BitcoinAddress)
  .setTtl(600) // seconds
  .build();

const { secret, verifyUrl } = await service.addPayment(payment);
```

Store `secret` with the invoice. Put `branta_id` and `branta_secret` on the wallet QR. Parent platforms: [docs](https://developer.branta.pro).

## Crypto

Browsers on HTTPS: nothing to do.

Browsers on HTTP, or React Native / Expo: pass `crypto`, and use `service.createPaymentBuilder()` instead of `new PaymentBuilder()`.

**React Native / Expo** — `@noble`:

```bash
npm i @noble/hashes @noble/ciphers
```

```ts
import { BrantaEnvironment, BrantaService, createNobleCryptoProvider } from "@branta-ops/branta";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/hashes/utils.js";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  crypto: createNobleCryptoProvider({ sha256, hmac, gcm, randomBytes }),
});
```

**Browser on HTTP** — `@peculiar/webcrypto`:

```bash
npm i @peculiar/webcrypto
```

```ts
import { Crypto } from "@peculiar/webcrypto";
import { BrantaEnvironment, BrantaService } from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  crypto: new Crypto(),
});
```

## API

| | |
|---|---|
| `BrantaService` | `verify`, `addPayment`, `isApiKeyValid`, `createPaymentBuilder` |
| Options | `environment`, `apiKey`, `hmacSecret`, `crypto`, `fetchImpl`. Per-call overrides: `BrantaApiOptions`. |
| `DestinationType` | `bitcoin_address`, `bolt11`, `ark_address`, `silent_payment` |

[Changelog](CHANGELOG.md) · [Security](SECURITY.md) · [Docs](https://developer.branta.pro)
