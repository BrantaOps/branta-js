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
import { BrantaServerBaseUrl } from "@branta-ops/branta";
import { BrantaService } from "@branta-ops/branta/v2";

const service = new BrantaService({
  baseUrl: BrantaServerBaseUrl.Production,
  privacy: 'loose',
});

await service.getPayments("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
```

### For Platforms

```ts
import { BrantaServerBaseUrl } from "@branta-ops/branta";
import { BrantaService, PaymentBuilder } from "@branta-ops/branta/v2";

const service = new BrantaService({
  baseUrl: BrantaServerBaseUrl.Production,
  defaultApiKey: "<default-api-key>",
  privacy: 'loose',
});

const payment = new PaymentBuilder()
  .setDescription("Testing description")
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setTtl(600)
  .build();

await service.addPayment(payment);
```

### For Parent Platforms

```ts
import { BrantaServerBaseUrl } from "@branta-ops/branta";
import { BrantaService, PaymentBuilder } from "@branta-ops/branta/v2";

const service = new BrantaService({
  baseUrl: BrantaServerBaseUrl.Production,
  defaultApiKey: "<default-api-key>",
  hmacSecret: "<hmac-secret>",
  privacy: 'loose',
});

const payment = new PaymentBuilder()
  .setDescription("Testing description")
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setTtl(600)
  .build();

await service.addPayment(payment);
```

### Zero-Knowledge Payment

```ts
const payment = new PaymentBuilder()
  .addDestination("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin_address")
  .setZk()
  .build();

const { payment: response, secret } = await service.addPayment(payment);
// `secret` is the encryption key needed to look the payment up later.
```

## React Native

This SDK uses the Web Crypto API (`crypto.subtle`) and the `URL` constructor, which are not available in React Native's JavaScript engine (Hermes/JavaScriptCore) by default. You need two polyfills.

**1. Install the polyfills**

```bash
npm install react-native-quick-crypto react-native-url-polyfill
```

For bare React Native, link the native module:

```bash
npx pod-install   # iOS
```

**2. Create a shims file**

Create `shims.js` (or `shims.ts`) anywhere in your project:

```js
import 'react-native-url-polyfill/auto';
import QuickCrypto from 'react-native-quick-crypto';

// Polyfill the global crypto object with Web Crypto API support
global.crypto = QuickCrypto;
```

**3. Import the shims before everything else**

At the very top of your app entry point (`index.js` or `App.tsx`), before any other imports:

```js
import './shims'; // must be first

import { AppRegistry } from 'react-native';
import App from './App';
// ...
```

> **Why first?** The SDK resolves `crypto` at import time. If the shim loads after the SDK, the polyfill won't be in place when it's needed.

This is the same pattern used by [viem](https://viem.sh/docs/getting-started#react-native) (Ethereum SDK) for identical reasons.

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
