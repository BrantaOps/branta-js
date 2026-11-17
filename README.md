# @branta-ops/branta

JavaScript SDK for [Branta](https://developer.branta.pro). ESM only.

`verify()` on send. `addPayment()` on receive. Parent platforms are in the [developer docs](https://developer.branta.pro).

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
    // 5xx, 429, no network, or the 30s timeout. Tell the user. Do not block send.
    break;
}
```

A unified QR can bind more than one entry in `matchedDestinations`. Honor each `type`. The asset is that `type`. Every EVM stablecoin uses the `ethereum:` scheme.

A Bitcoin or EVM stablecoin lookup needs `branta_id` and `branta_secret` in the URI. bolt11, Ark, and silent payments resolve from the value. A bare address is `unknown`. The full rules are on [Status rules](https://developer.branta.pro/setup/send/status-rules), and supported chains and contracts are on [Destination types](https://developer.branta.pro/destination-types).

A missing crypto implementation throws `crypto_unavailable`.

## Receive

Hold the API key server-side. `addPayment` encrypts a copy and leaves the caller's `Payment` unchanged.

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
```

`branta_id` is that ciphertext, URL-encoded. `branta_secret` is `secret`. Link the sender to `verifyUrl`.

```
bitcoin:<address>?branta_id=<url-encoded branta_id>&branta_secret=<secret>
```

A stablecoin destination is the deposit address plus its type, for example `DestinationType.UsdcBase`. The invoice is an ERC-681 transfer with the same two params. Chain ids and contracts are on [Destination types](https://developer.branta.pro/destination-types).

```
ethereum:<token-contract>@<chain-id>/transfer?address=<deposit>&uint256=<base-units>&branta_id=<url-encoded branta_id>&branta_secret=<secret>
```

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
