# @branta-ops/branta

JavaScript SDK for [Branta](https://developer.branta.pro). ESM only.

Status handling and parent platforms are in the [developer docs](https://developer.branta.pro).

## Install

```bash
npm i @branta-ops/branta
```

## Send

Pass the scanned QR or pasted text through unchanged. Use `BrantaEnvironment.Staging` until you go live.

```ts
import { BrantaEnvironment, BrantaService } from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
});

const result = await service.verify(input);

switch (result.status) {
  case "match":
    // Card: result.payments[0]. Link result.verifyUrl.
    // Pay result.matchedDestinations[0].value for result.matchedDestinations[0].type.
    break;
  case "unknown":
    // Not in Branta, including a 404. Show nothing.
    break;
  case "tampered":
    // The destination was altered. Warn. Do not show a verified card.
    break;
  case "incomplete":
    // Branta could not complete the check. Tell the user. Do not block send.
    break;
}
```

Rules for each status: [Status rules](https://developer.branta.pro/setup/send/status-rules). Supported types: [Destination types](https://developer.branta.pro/destination-types).

A missing crypto implementation throws `crypto_unavailable`.

## Receive

Hold the API key server-side.

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

const { payment: created, secret, verifyUrl } = await service.addPayment(payment);
const brantaId = created.destinations[0].value;
// Store secret with the invoice. Put branta_id and branta_secret on the QR.
// branta_id is brantaId, URL-encoded. Link the sender to verifyUrl.
```

`addPayment` accepts the types on [Destination types](https://developer.branta.pro/destination-types). Pass the type for stablecoins. A bare address is not auto-detected. `UsdtTron`, `UsdtTon`, `UsdtSolana`, and `UsdcSolana` also encrypt and post, but no URI verifies them.

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

[Changelog](CHANGELOG.md) · [Security](SECURITY.md)
