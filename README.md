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
- **Parent Platform** — multi-tenant, manages multiple child platforms each with their own API key and HMAC secret.

**2. Follow the matching Quick Start section below.**

**3. Apply these rules:**

General (all types):
- Always use `privacy: 'strict'`. Never switch to `'loose'` unless there is no QR scanner and ZK is impossible.
- Never instantiate `BrantaClient` directly — always use `BrantaService`.
- Never show an error or "not verified" message when a lookup returns empty or throws. An empty result means the destination is unknown to Branta, not that it is malicious. Show nothing.
- For `baseUrl`: use `BrantaServerBaseUrl.Production` only in production environments. Use `BrantaServerBaseUrl.Staging` everywhere else — including local development, CI, and staging/test environments.

Send side (wallets):
- Prefer `getPaymentsByQrCode` over `getPayments` — it handles multi-value ZK QR payloads correctly.
- Only fall back to `getPayments` for copy/paste flows where there is no QR code.
- If `result.payments` is empty or an exception is thrown, render nothing.
- When `result.payments` is non-empty, display: the platform logo, the platform name (`payment.platform`), and the payment description (`payment.description`). Only render description when non-empty. Make the verification card a clickable link to `result.verifyUrl` — do not display the raw URL.
- For the platform logo: on dark backgrounds use `payment.platformLogoUrl`. On light backgrounds prefer `payment.platformLogoLightUrl` when available, falling back to `payment.platformLogoUrl`.
- Optionally display `payment.parentPlatform?.logoUrl` / `payment.parentPlatform?.logoLightUrl` as a small secondary badge (e.g. corner icon). This is not required.

Receive side (platforms):
- Always call `.setZk()` on the `PaymentBuilder` before calling `addPayment`. Plain-text destinations are rejected in `strict` mode.
- Store the `secret` returned by `addPayment` alongside the invoice — it is required to reconstruct the verify URL for the wallet.

Receive side (parent platforms), in addition to the platform rules:
- Include `hmacSecret` in the `BrantaService` options.
- Pass per-call options to scope requests to the correct child platform's API key.

# Quick Start

## For Wallets

Wallets should use `strict` privacy mode. Two flows are supported:

- **Copy/paste**: call `getPayments` with the pasted text. Plain-text on-chain addresses will not return results in strict mode — they must be ZK-encoded. Lightning destinations (bolt11, bolt12, ln_url, ln_address) work as plain text.
- **QR scan**: call `getPaymentsByQrCode` with the raw QR text. This handles both on-chain (when the QR includes `branta_id` / `branta_secret`) and lightning destinations.

Always catch errors and show nothing on not-found — a missing record just means the address was not posted to Branta.

```ts
import { BrantaServerBaseUrl } from "@branta-ops/branta";
import { BrantaService } from "@branta-ops/branta/v2";

const service = new BrantaService({
  baseUrl: BrantaServerBaseUrl.Production,
  privacy: 'strict',
});

async function lookup(input: string, isQrCode: boolean) {
  try {
    const result = isQrCode
      ? await service.getPaymentsByQrCode(input)
      : await service.getPayments(input);

    if (result.payments.length === 0) {
      // Not found — show nothing. The address may simply not exist in Branta.
      return;
    }

    // Render result.payments and result.verifyUrl
  } catch {
    // Swallow errors — never surface a "not found" or lookup failure to the user.
  }
}
```

## For Platforms

Platforms post payments to Branta so wallets can verify them. Use `strict` privacy mode and mark each destination ZK via `setZk()` on the `PaymentBuilder`.

```ts
import { BrantaServerBaseUrl } from "@branta-ops/branta";
import { BrantaService, PaymentBuilder } from "@branta-ops/branta/v2";

const service = new BrantaService({
  baseUrl: BrantaServerBaseUrl.Production,
  defaultApiKey: "<default-api-key>",
  privacy: 'strict',
});

const payment = new PaymentBuilder()
  .setDescription("Testing description")
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setZk()
  .setTtl(600)
  .build();

const { payment: response, secret, verifyUrl } = await service.addPayment(payment);
// `secret` is the encryption key needed to look the payment up later.
```

## For Parent Platforms

Parent Platforms sign requests with HMAC in addition to the API key. Use `strict` privacy mode and ZK destinations.

```ts
import { BrantaServerBaseUrl } from "@branta-ops/branta";
import { BrantaService, PaymentBuilder } from "@branta-ops/branta/v2";

const service = new BrantaService({
  baseUrl: BrantaServerBaseUrl.Production,
  defaultApiKey: "<default-api-key>",
  hmacSecret: "<hmac-secret>",
  privacy: 'strict',
});

const payment = new PaymentBuilder()
  .setDescription("Testing description")
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setZk()
  .setTtl(600)
  .build();

const { payment: response, secret, verifyUrl } = await service.addPayment(payment);
```

# Release

 - npm login
 - npm version major|minor|patch
 - npm publish

# Responsible Disclosure

Found critical bugs/vulnerabilities? Please email them to support@branta.pro. Thanks!
