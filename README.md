# Branta JavaScript SDK

Package contains functionality to assist JavaScript projects with making requests to Branta's server.

## Installation

Install via npm:

```bash
npm i @branta-ops/branta
```

## Quick Start

### For Wallets
```ts
import { V2BrantaClient, BrantaServerBaseUrl } from "@branta-ops/branta";

const client = new V2BrantaClient({
  baseUrl: BrantaServerBaseUrl.Production,
});

await client.getPayments("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
```

### For Platforms

```ts
import { V2BrantaClient, BrantaServerBaseUrl } from "@branta-ops/branta";

const client = new V2BrantaClient({
  baseUrl: BrantaServerBaseUrl.Production,
  defaultApiKey: "<default-api-key>",
});

await client.addPayment({
  description: "Testing description",
  destinations: [
    {
      value: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      isZk: false,
    },
  ],
  ttl: 600,
});
```

### For Parent Platforms

```ts
import { V2BrantaClient, BrantaServerBaseUrl } from "@branta-ops/branta";

const client = new V2BrantaClient({
  baseUrl: BrantaServerBaseUrl.Production,
  defaultApiKey: "<default-api-key>",
  hmacSecret: "<hmac-secret>",
});

await client.addPayment({
  description: "Testing description",
  destinations: [
    {
      value: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      isZk: false,
    },
  ],
  ttl: 600,
});
```

## Release
 - npm login
 - npm version major|minor|patch
 - npm publish

## Feature Support

 - [X] Per Environment configuration
 - [X] V2 Get Payment by address
 - [X] V2 Get Payment by QR Code
 - [X] V2 Get decrypted Zero Knowledge by address and secret
 - [X] V2 Add Payment
 - [X] V2 Payment by Parent Platform with HMAC
 - [X] V2 Add Zero Knowledge Payment with secret
 - [X] V2 Check API key valid
