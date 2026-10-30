# Install

```bash
npm i @branta-ops/branta
```

# Integration Guide

If you are an AI agent implementing this SDK, follow the steps below exactly. If you are a developer, use this as a reference for the recommended integration patterns.

**1. Ask which side(s) of a payment they are implementing:**
- **Send side** — the app is paying someone (e.g. a wallet). The user scans or pastes a destination and you verify it belongs to a known platform before funds are sent.
- **Receive side** — the app is receiving payment (e.g. a checkout, POS, invoicing platform). You post destinations to Branta so wallets can verify them.
- **Both** — some apps do both (e.g. an exchange or self-custodial wallet with invoice generation). Implement each side independently.

If they are on the receive side, ask one follow-up:
- **Platform** — single-tenant, one API key.
- **Parent Platform** — multi-tenant, manages multiple child platforms. Two variants:
  - **Per-client keys** — each child has its own API key; requests are signed with the parent HMAC secret; you scope requests per-call.
  - **Shared key** — one API key for all children (no HMAC); tag the child per-payment with `setChildPlatform()`.

**2. Ask what environment the app runs in:**
- **Browser over HTTPS** — no extra setup needed; `crypto.subtle` is available by default.
- **Browser over HTTP** or **React Native / Expo** — `crypto.subtle` is not available. The SDK accepts a `crypto` option so you can supply a provider. See [Crypto provider setup](#crypto-provider-setup) below and implement the appropriate provider before wiring up `BrantaService`.

**3. Follow the matching Quick Start section below.**

**4. Apply these rules:**

General (all types):
- Use `BrantaService`. Do not call Guardrail HTTP yourself.
- Switch on `result.status`. Do not infer outcome from `payments` or from thrown errors.
- For `environment`: use `BrantaEnvironment.Production` only in production environments. Use `BrantaEnvironment.Staging` everywhere else — including local development, CI, and staging/test environments.
- If serving over HTTP or running in React Native / Expo, pass a `crypto` option to `BrantaService` (see step 2) and always use `service.createPaymentBuilder()` rather than `new PaymentBuilder()`.

Send side (wallets):
- Call `verify` with the scanned QR text or the pasted destination. One method handles both.
- `match` — show the card: platform logo, platform name (`payment.platform`), and description when non-empty. Link the card to `result.verifyUrl`; do not display the raw URL.
- `unknown` — not in Branta. Show nothing. Do not say “not verified.”
- `tampered` — the destination was altered. Warn. Do not show a verified card. Do not block the send unless your product chooses to.
- For the platform logo: on dark backgrounds use `payment.platformLogoUrl`. On light backgrounds prefer `payment.platformLogoLightUrl` when available, falling back to `payment.platformLogoUrl`.
- Optionally display `payment.parentPlatform?.logoUrl` / `payment.parentPlatform?.logoLightUrl` as a small secondary badge (e.g. corner icon). This is not required.

Receive side (platforms):
- `addDestination` encrypts every destination. Only bitcoin, bolt11, Ark, and silent payments are accepted.
- Store the `secret` returned by `addPayment` alongside the invoice — it is required to reconstruct the verify URL for the wallet.

Receive side (parent platforms — per-client keys), in addition to the platform rules:
- Include `hmacSecret` in the `BrantaService` options but omit `apiKey` at service construction.
- Pass per-call options with each child's `apiKey` to scope requests.

Receive side (parent platforms — shared key), in addition to the platform rules:
- Include `apiKey` in the `BrantaService` options. Do not include `hmacSecret`.
- Call `.setChildPlatform(name, logoUrl, logoLightUrl)` on the builder to tag each payment with the child's branding.

# Quick Start

## For Wallets

Pass the scanned QR text or the pasted destination to `verify`. bolt11, Ark, and Silent Payments resolve from the value. On-chain Bitcoin needs a `bitcoin:` URI with `branta_id` / `branta_secret` (that is how platforms encode a Branta invoice). A bare address is `unknown`.

```ts
import { BrantaEnvironment, BrantaService } from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
});

async function lookup(input: string) {
  try {
    const result = await service.verify(input);

    switch (result.status) {
      case "match":
        // Show the card for result.payments. Link it to result.verifyUrl.
        return;
      case "unknown":
        // Not in Branta — show nothing.
        return;
      case "tampered":
        // Destination was altered. Warn. Do not show a verified card.
        return;
    }
  } catch {
    // Environment or network failure — show nothing.
  }
}
```

## For Platforms

Platforms post payments to Branta so wallets can verify them. Every destination is encrypted.

```ts
import { BrantaEnvironment, BrantaService, PaymentBuilder } from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  apiKey: "<api-key>",
});

const payment = new PaymentBuilder()
  .setDescription("Testing description")
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setTtl(600) // seconds
  .build();

const { payment: response, secret, verifyUrl } = await service.addPayment(payment);
// `secret` is the encryption key needed to look the payment up later.
```

## For Parent Platforms

Choose a variant based on how API keys are structured. Shared key needs only an API key; per-client keys also require HMAC.

<details>
<summary>Shared key — one API key covers all children (Recommended)</summary>

Construct with a single API key; identify the child platform per-payment. No HMAC secret.

```ts
import { BrantaEnvironment, BrantaService, PaymentBuilder } from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  apiKey: "<shared-api-key>",
});

const payment = new PaymentBuilder()
  .setDescription("Testing description")
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setChildPlatform("ChildBrand", "https://example.com/logo.png")
  .setTtl(600)
  .build();

const { payment: response, secret, verifyUrl } = await service.addPayment(payment);
```

</details>

<details>
<summary>Per-client keys — each child has its own API key</summary>

Construct the service with the shared HMAC secret only; pass each child's API key per-call.

```ts
import { BrantaEnvironment, BrantaService, PaymentBuilder } from "@branta-ops/branta";

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  hmacSecret: "<hmac-secret>",
});

const payment = new PaymentBuilder()
  .setDescription("Testing description")
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setTtl(600)
  .build();

// Scope to the child platform's API key per-call
const { payment: response, secret, verifyUrl } = await service.addPayment(payment, {
  apiKey: "<child-api-key>",
});
```

</details>

# Crypto provider setup

Some environments do not expose `globalThis.crypto.subtle`:

- **Browsers on HTTP** — browsers block `crypto.subtle` on insecure origins.
- **React Native / Expo** — `globalThis.crypto.subtle` is not available even on localhost.

Pass a `BrantaCryptoProvider` as the `crypto` option to supply your own implementation. The SDK ships no crypto dependencies — you choose the provider.

**Option A — `@peculiar/webcrypto` (recommended, zero adapter code)**

```bash
npm i @peculiar/webcrypto
```

```ts
import { Crypto } from '@peculiar/webcrypto';
import { BrantaEnvironment, BrantaService } from '@branta-ops/branta';

const crypto = new Crypto();
const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  crypto,
});

// On the receive side, use createPaymentBuilder() so the builder
// shares the same crypto instance:
const payment = service.createPaymentBuilder()
  .addDestination('...', 'bitcoin_address')
  .build();
```

`@peculiar/webcrypto` implements the full Web Crypto API and satisfies `BrantaCryptoProvider` with no adapter code.

**Option B — `@noble` packages (zero transitive dependencies, works in React Native)**

```bash
npm i @noble/hashes @noble/ciphers
```

```ts
import { BrantaEnvironment, BrantaService, createNobleCryptoProvider } from '@branta-ops/branta';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/hashes/utils.js';

const service = new BrantaService({
  environment: BrantaEnvironment.Production,
  crypto: createNobleCryptoProvider({ sha256, hmac, gcm, randomBytes }),
});
```

# Release

 - npm login
 - npm version major|minor|patch
 - npm publish

# Responsible Disclosure

Found critical bugs/vulnerabilities? Please email them to support@branta.pro. Thanks!
