# x402 Echo Merchant Server

A modern, developer-focused pay-per-use API demo server for the [x402 protocol](https://x402.org). Instantly test x402 payments, see live paywall enforcement, and get a rizzler GIF reward after payment—plus a full refund!

---

## Demo

[https://x402.payai.network/](https://x402.payai.network)

---

## Features

- **Pay-per-use API endpoints** on Base Mainnet and Base Sepolia
- **x402 paywall middleware**: Enforces payment before serving protected content
- **Rizzler GIF reward**: After payment, receive a fun GIF and full transaction/refund details
- **100% refunds**: All payments are instantly refunded for demo/testing
- **Modern UI**: Built with Next.js, TailwindCSS, and shadcn/ui
- **Edge-compatible**: Middleware works on Vercel/Edge, with Node.js logic offloaded to API routes

---

## How It Works

1. **Request a paid endpoint** (e.g. `/api/base/paid-content`)
2. **x402 middleware** checks for payment and enforces the paywall
3. **After payment**:
   - Middleware verifies and settles the payment
   - Instantly refunds the payment
   - Returns a custom HTML page with:
     - "Thank you for your payment! Have some rizz!"
     - The rizzler
     - Payment and refund transaction links
     - The full payment response as a code snippet

---

## Local Development

1. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

2. **Set up environment variables:**

   - Copy `.env.example` to `.env` and fill in required values (see below)

3. **Run the dev server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   - The app will be available at [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

- `NEXT_PUBLIC_SITE_URL` - Base URL of the server (used by the web app)
- `FACILITATOR_URL` - URL of the x402 facilitator service (e.g. `https://facilitator.payai.network`)

- `EVM_RECEIVE_PAYMENTS_ADDRESS` - EVM address to receive payments to
- `SVM_RECEIVE_PAYMENTS_ADDRESS` - Solana address to receive payments to
- `EVM_PRIVATE_KEY` - EVM private key used to send refunds (hex string starting with `0x`)
- `SVM_PRIVATE_KEY` - Solana private key used to send refunds

- `BASE_RPC_URL` - Base Mainnet RPC URL (https)
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia RPC URL (https)
- `AVALANCHE_RPC_URL` - Avalanche Mainnet RPC URL (https)
- `AVALANCHE_FUJI_RPC_URL` - Avalanche Fuji Testnet RPC URL (https)
- `SEI_RPC_URL` - Sei Mainnet RPC URL (https)
- `SEI_TESTNET_RPC_URL` - Sei Testnet RPC URL (https)
- `POLYGON_RPC_URL` - Polygon Mainnet RPC URL (https)
- `POLYGON_AMOY_RPC_URL` - Polygon Amoy Testnet RPC URL (https)
- `SOLANA_RPC_URL` - Solana Mainnet RPC URL (https)
- `SOLANA_DEVNET_RPC_URL` - Solana Devnet RPC URL (https)
- `SOLANA_WS_URL` - (optional) Solana Mainnet WebSocket URL (wss)
- `SOLANA_DEVNET_WS_URL` - (optional) Solana Devnet WebSocket URL (wss)
- `IOTEX_RPC_URL` - (optional) IoTeX Mainnet RPC URL (https)
- `PEAQ_RPC_URL` - Peaq Mainnet RPC URL (https)

---

## Deployment

- Deploy to Vercel, your own Node.js server, or any platform supporting Next.js
- For Edge compatibility, all Node.js-only logic is handled in API routes, including:
  ---- authenticating with @coinbase/cdp-sdk which relies on the NodeJS crypto library

---

## License

Apache V2

---

## Adding support for a new network (Echo Merchant)

To add a new network (example: `peaq`) across the Echo Merchant UI, middleware, and API:

1. Make sure that you `npm install` the `x402` package version that contains the new network.

2. Frontend link on homepage

   - Edit `src/app/page.tsx`
   - Add a new entry to `MAINNET_ENDPOINTS` or `TESTNET_ENDPOINTS`:
     - `{ label: 'Peaq Mainnet', url: `${API_URL}/api/peaq/paid-content` }`

3. Middleware route & config

   - Edit `src/middleware.ts`
   - Create a route config for the network:
     - `const peaqConfig = { price: '$0.01', network: 'peaq', config: { description: '...' } }`
   - Wire the path to the paywall middleware:
     - `if (pathname.startsWith('/api/peaq/')) { return paymentMiddleware(payToEVM, { '/api/peaq/paid-content': peaqConfig }, { url: facilitatorUrl })(request); }`
   - Add the matcher so the middleware runs:
     - include `'/api/peaq/paid-content/:path*'` in `export const config.matcher`.

4. API route file

   - Create `src/app/api/<network>/paid-content/route.ts` with a basic `GET` that returns `{ ok: true }`.
   - The actual paywall logic is enforced in middleware; the route acts as the endpoint.

5. Paywall app (wallet flow)

   - Edit `src/paywall/src/PaywallApp.tsx`
   - Import the chain from `viem/chains` and map it:
     - Import: `import { peaq } from 'viem/chains'`
     - Add to `paymentChain` switch and to `chainName` mapping.

6. Explorer links

   - Edit `src/lib/utils.ts` if you want explorer links for the new network in the rizzler page:
     - Update `getExplorerForNetwork` and `renderRizzlerHtml` to include the new network.

7. Environment variables

   - Set `<NETWORK>_RPC_URL` to a private custom RPC from Alchemy if possible, otherwise find a suitable RPC for the network and add it here. `<NETWORK>` is to be replaced by the network name.
   - Ensure you have `FACILITATOR_URL` pointing to your facilitator (which must support the network).
   - Ensure `EVM_RECEIVE_PAYMENTS_ADDRESS` is set for EVM networks.
   - For SVM networks, set `SVM_RECEIVE_PAYMENTS_ADDRESS`.

8. Refund flow

   - Edit `src/refund.ts` and update the EVM signer factory:
     - Import your chain from `viem/chains` (e.g., `peaq`).
     - Add a `network === '<network>'` branch in `getSigner` that returns a `createWalletClient` with the chain and `process.env.<NETWORK>_RPC_URL`.
   - Ensure the `x402` package version you installed includes the new network in `SupportedEVMNetworks` so the refund path triggers for EVM.
   - Set `<NETWORK>_RPC_URL` in your `.env` (same value used by `getSigner`).

9. Test
   - Visit `/api/<network>/paid-content` in a browser.
   - You should see the paywall, be able to connect a wallet, pay, and receive the rizzler page.

A good way to test is by running the facilitator locally and using it to do an end-to-end test with the echo merchant.
Make sure to read its [README.md](https://github.com/PayAINetwork/payai-x402-facilitator/blob/main/README.md#adding-support-for-a-new-network-facilitator) for how to set up a new network on the facilitator.
