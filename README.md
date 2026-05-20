# Install

```bash
npm i @branta-ops/branta
```

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
