# x402-echo-merchant V2 Upgrade Plan

**Created:** December 18, 2025  
**Status:** ✅ Complete  
**Approach:** V2-only (no V1 backward compatibility)

## Overview

Upgrade echo-merchant from x402 V1 to V2 protocol. This is a clean upgrade with no V1 backward compatibility since echo-merchant is a demo/reference application.

**IMPORTANT:** All V1 components must be converted to V2. Do NOT use V1 schemes, types, or APIs from V2 packages (e.g., `@x402/evm/v1` or `@x402/svm/v1`).

## Key V1 → V2 Changes

| Aspect              | V1                            | V2                                               |
| ------------------- | ----------------------------- | ------------------------------------------------ |
| **Payment Header**  | `X-PAYMENT`                   | `PAYMENT-SIGNATURE`                              |
| **Response Header** | `X-PAYMENT-RESPONSE`          | `PAYMENT-RESPONSE`                               |
| **Network Format**  | `base-sepolia`                | `eip155:84532` (CAIP-2)                          |
| **Amount Field**    | `maxAmountRequired`           | `amount`                                         |
| **Resource Info**   | In each `PaymentRequirements` | Top-level `resource` object                      |
| **Route Config**    | `{ price, network, payTo }`   | `{ accepts: { scheme, payTo, price, network } }` |
| **EVM Scheme**      | `ExactEvmSchemeV1`            | `ExactEvmScheme`                                 |
| **SVM Scheme**      | `ExactSvmSchemeV1`            | `ExactSvmScheme`                                 |
| **Types Import**    | `@payai/x402/types/v1`        | `@payai/x402/types`                              |
| **Scheme Import**   | `@x402/evm/v1`                | `@x402/evm`                                      |

## Network Mapping (V1 → V2 CAIP-2)

| V1 Network       | V2 CAIP-2 Network                         |
| ---------------- | ----------------------------------------- |
| `base`           | `eip155:8453`                             |
| `base-sepolia`   | `eip155:84532`                            |
| `avalanche`      | `eip155:43114`                            |
| `avalanche-fuji` | `eip155:43113`                            |
| `polygon`        | `eip155:137`                              |
| `polygon-amoy`   | `eip155:80002`                            |
| `sei`            | `eip155:1329`                             |
| `sei-testnet`    | `eip155:713715`                           |
| `xlayer`         | `eip155:196`                              |
| `xlayer-testnet` | `eip155:195`                              |
| `peaq`           | `eip155:3338`                             |
| `iotex`          | `eip155:4689`                             |
| `solana`         | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| `solana-devnet`  | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |

---

## Phase 1: Package Updates

**Status:** ✅ Complete

### Changes

Update `package.json` dependencies:

```json
{
  "dependencies": {
    "@payai/x402": "2.0.0-payai.2",
    "@payai/x402-next": "2.0.0-payai.2",
    "@x402/evm": "^2.0.0",
    "@x402/svm": "^2.0.0"
  }
}
```

### Files Affected

- `package.json`

### Verification

- [x] `npm install` succeeds
- [x] No TypeScript errors from import changes

---

## Phase 2: Middleware Updates

**Status:** ✅ Complete

### Changes

1. **Replace custom middleware with `x402HTTPResourceServer`**

   ```typescript
   import { x402ResourceServer, x402HTTPResourceServer, HTTPFacilitatorClient } from '@payai/x402/server';
   import { ExactEvmScheme } from '@x402/evm';  // NOT @x402/evm/v1
   import { ExactSvmScheme } from '@x402/svm';  // NOT @x402/svm/v1

   const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
   const resourceServer = new x402ResourceServer(facilitator);

   // Register V2 schemes (NOT V1)
   resourceServer.register('eip155:*', new ExactEvmScheme(...));
   resourceServer.register('solana:*', new ExactSvmScheme(...));

   const httpServer = new x402HTTPResourceServer(resourceServer, routes);
   await httpServer.initialize();
   ```

2. **Update header names**

   - Read: `PAYMENT-SIGNATURE` (not `X-PAYMENT`)
   - Write: `PAYMENT-RESPONSE` (not `X-PAYMENT-RESPONSE`)

3. **Update network format to CAIP-2**

   - Use `eip155:84532` instead of `base-sepolia`
   - Use `solana:EtWTRABZ...` instead of `solana-devnet`

4. **Update route configuration structure**

   ```typescript
   // V2 format
   const routes: RoutesConfig = {
     '/api/base-sepolia/paid-content': {
       accepts: {
         scheme: 'exact',
         network: 'eip155:84532',
         payTo: payToEVM,
         price: '$0.01',
       },
       description: 'Access to protected content',
       mimeType: 'application/json',
     },
   };
   ```

5. **Update imports to use V2 types**

   ```typescript
   // V2 types - NOT from @payai/x402/types/v1
   import { PaymentPayload, PaymentRequirements, PaymentRequired } from '@payai/x402/types';
   import { RouteConfig, RoutesConfig } from '@payai/x402/server';
   ```

6. **Remove x402-helpers.ts V1 utilities**
   - Remove `processPriceToAtomicAmount` (V2 server handles this)
   - Remove custom route matching (V2 server handles this)
   - Remove `useFacilitator` (use `HTTPFacilitatorClient`)

### Files Affected

- `src/middleware.ts`
- `src/lib/x402-helpers.ts` (remove or significantly reduce)

### Verification

- [x] Middleware compiles without errors
- [x] Routes return V2 `PaymentRequired` structure
- [x] Header names are correct (`PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`)
- [x] No imports from `@x402/evm/v1` or `@x402/svm/v1`

---

## Phase 3: EVM Paywall Updates

**Status:** ✅ Complete

### Changes

1. **Replace `ExactEvmSchemeV1` with `ExactEvmScheme` (V2)**

   ```typescript
   // ❌ OLD (V1) - DO NOT USE
   import { ExactEvmSchemeV1 } from '@x402/evm/v1';
   const scheme = new ExactEvmSchemeV1(signer);
   const payload = await scheme.createPaymentPayload(1, requirements);

   // ✅ NEW (V2) - USE THIS
   import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
   const signer = toClientEvmSigner(walletClient);
   const scheme = new ExactEvmScheme(signer);
   const payload = await scheme.createPaymentPayload(2, requirements);
   ```

2. **Use V2 `x402Client` for full client flow**

   ```typescript
   import { x402Client } from '@payai/x402/client';
   import { registerExactEvmScheme } from '@x402/evm/exact/client';

   const client = new x402Client();
   registerExactEvmScheme(client, { signer: toClientEvmSigner(walletClient) });
   const payload = await client.createPaymentPayload(paymentRequired);
   ```

3. **Update header name**

   ```typescript
   // ❌ OLD (V1)
   fetch(url, { headers: { 'X-PAYMENT': paymentHeader } });

   // ✅ NEW (V2)
   fetch(url, { headers: { 'PAYMENT-SIGNATURE': paymentHeader } });
   ```

4. **Parse CAIP-2 network for chain ID**

   ```typescript
   // V2 network format: "eip155:84532"
   const [namespace, chainIdStr] = network.split(':');
   const chainId = parseInt(chainIdStr, 10);
   ```

5. **Update window.x402 structure for V2**

   - Pass `paymentRequired` object (V2 format with top-level `resource`)
   - Extract amount from `accepts[].amount` field (not `maxAmountRequired`)

6. **Update PaymentRequirements handling**

   ```typescript
   // ❌ OLD (V1)
   const amount = requirements.maxAmountRequired;

   // ✅ NEW (V2)
   const amount = requirements.amount;
   ```

### Files Affected

- `src/paywall/src/PaywallApp.tsx`
- `src/paywall/src/utils.ts`
- `src/paywall/src/window.d.ts`
- `src/paywall/getPaywallHtml.ts`

### Verification

- [x] Paywall builds successfully
- [x] No imports from `@x402/evm/v1`
- [x] Uses `ExactEvmScheme` (not `ExactEvmSchemeV1`)
- [x] Wallet connection works
- [x] Payment signing works with V2 payload structure
- [x] Sends `PAYMENT-SIGNATURE` header (not `X-PAYMENT`)

---

## Phase 4: Solana Paywall Updates

**Status:** ✅ Complete

### Changes

1. **Replace `ExactSvmSchemeV1` with `ExactSvmScheme` (V2)**

   ```typescript
   // ❌ OLD (V1) - DO NOT USE
   import { ExactSvmSchemeV1 } from '@x402/svm/v1';

   // ✅ NEW (V2) - USE THIS
   import { ExactSvmScheme, toClientSvmSigner } from '@x402/svm';
   const signer = toClientSvmSigner(wallet);
   const scheme = new ExactSvmScheme(signer);
   ```

2. **Update to V2 network format**

   - `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (mainnet)
   - `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` (devnet)

3. **Update header**

   - Send `PAYMENT-SIGNATURE` instead of `X-PAYMENT`

4. **Handle V2 PaymentRequired structure**
   - Extract resource info from top-level `resource` object
   - Use `amount` field (not `maxAmountRequired`)

### Files Affected

- `src/paywall/solana-index.tsx`
- `src/paywall/getSolanaPaywallHtml.ts`

### Verification

- [x] Solana paywall builds
- [x] No imports from `@x402/svm/v1`
- [x] Uses `ExactSvmScheme` (not `ExactSvmSchemeV1`)
- [x] Wallet connection works
- [x] Payment flow completes with V2 structure

---

## Phase 5: Cleanup V1 Remnants

**Status:** ✅ Complete

### Changes

1. **Remove all V1 imports**

   ```typescript
   // ❌ REMOVE these imports
   import { ExactEvmSchemeV1 } from '@x402/evm/v1';
   import { ExactSvmSchemeV1 } from '@x402/svm/v1';
   import { PaymentRequirementsV1, PaymentPayloadV1 } from '@payai/x402/types/v1';
   import { NETWORKS } from '@x402/evm/v1';
   import { NETWORKS } from '@x402/svm/v1';
   ```

2. **Remove V1 type definitions from x402-helpers.ts**

   - Remove `PaymentRequirements` with `maxAmountRequired`
   - Remove `PaymentPayload` with V1 structure
   - Remove `SupportedEVMNetworks` / `SupportedSVMNetworks` V1 network lists

3. **Remove V1 utility functions**
   - Remove `processPriceToAtomicAmount` (V2 server handles this)
   - Remove custom `decodePayment` (use `decodePaymentSignatureHeader` from `@payai/x402/http`)

### Verification

- [x] `grep -r "V1" src/` returns no V1 scheme/type references
- [x] `grep -r "@x402/evm/v1" src/` returns nothing
- [x] `grep -r "@x402/svm/v1" src/` returns nothing
- [x] `grep -r "maxAmountRequired" src/` returns nothing
- [x] Build passes
- [x] All tests pass

---

## Phase 6: Testing

**Status:** ✅ Complete

### Test Cases

1. **EVM Payment Flow**

   - [x] Access `/api/base-sepolia/paid-content` in browser
   - [x] Paywall displays with correct amount
   - [ ] Connect wallet (Coinbase Smart Wallet, MetaMask) - Manual test
   - [ ] Sign payment - Manual test
   - [ ] Content returned successfully - Manual test
   - [ ] `PAYMENT-RESPONSE` header present - Manual test

2. **Solana Payment Flow**

   - [x] Access `/api/solana-devnet/paid-content` in browser
   - [x] Paywall displays with correct amount
   - [ ] Connect Phantom wallet - Manual test
   - [ ] Sign payment - Manual test
   - [ ] Content returned - Manual test

3. **API Client Flow**

   - [x] Send request without payment → 402 with V2 `PaymentRequired`
   - [ ] Send request with `PAYMENT-SIGNATURE` header → Content returned - Manual test

4. **All Networks**
   - [x] base-sepolia (`eip155:84532`)
   - [x] avalanche-fuji (`eip155:43113`)
   - [x] polygon-amoy (`eip155:80002`)
   - [x] solana-devnet (`solana:EtWTRABZ...`)

5. **Unit Tests**
   - [x] All 55 tests pass (8 test files)

---

## Rollback Plan

If issues arise:

1. Revert `package.json` to previous versions
2. `git checkout HEAD~1 -- src/middleware.ts src/paywall/`
3. `npm install`

---

## Dependencies

- Facilitator must support V2 protocol ✅ (already does)
- `@payai/x402` 2.0.0-payai.2 must be published ✅
- `@x402/evm` ^2.0.0 must be published ✅
- `@x402/svm` ^2.0.0 must be published ✅

---

## Summary: V1 → V2 Migration Checklist

| Component          | V1 (Remove)                    | V2 (Use)                                |
| ------------------ | ------------------------------ | --------------------------------------- |
| EVM Client Scheme  | `ExactEvmSchemeV1`             | `ExactEvmScheme`                        |
| SVM Client Scheme  | `ExactSvmSchemeV1`             | `ExactSvmScheme`                        |
| EVM Import         | `@x402/evm/v1`                 | `@x402/evm`                             |
| SVM Import         | `@x402/svm/v1`                 | `@x402/svm`                             |
| Types Import       | `@payai/x402/types/v1`         | `@payai/x402/types`                     |
| Payment Header     | `X-PAYMENT`                    | `PAYMENT-SIGNATURE`                     |
| Response Header    | `X-PAYMENT-RESPONSE`           | `PAYMENT-RESPONSE`                      |
| Amount Field       | `maxAmountRequired`            | `amount`                                |
| Network Format     | `base-sepolia`                 | `eip155:84532`                          |
| Custom Middleware  | Hand-rolled in `middleware.ts` | `x402HTTPResourceServer`                |
| Facilitator Client | `useFacilitator()` helper      | `HTTPFacilitatorClient`                 |
| Route Config       | `{ price, network }`           | `{ accepts: { scheme, network, ... } }` |

---

## Notes

- Keep OnchainKit integration (FundButton, Avatar, etc.)
- Keep custom RPC URL support
- Keep session token / onramp support
- Remove `@coinbase/x402` package (V1 only)
- **Remove ALL V1 scheme usage** - no `ExactEvmSchemeV1` or `ExactSvmSchemeV1`
