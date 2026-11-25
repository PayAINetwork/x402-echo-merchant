import type { Network } from './x402-helpers';

/**
 * Public Solana endpoints used by the browser paywall when no paywall-specific
 * RPC is configured. These must accept requests from web pages: the public
 * mainnet endpoint (api.mainnet-beta.solana.com) answers browser requests with
 * 403 "Access forbidden", so mainnet uses PublicNode's free endpoint instead.
 */
const DEFAULT_SOLANA_PAYWALL_RPC = {
  solana: 'https://solana-rpc.publicnode.com',
  'solana-devnet': 'https://api.devnet.solana.com',
} as const;

/** `base-sepolia` -> `PAYWALL_BASE_SEPOLIA_RPC_URL` */
export function paywallRpcEnvName(network: string): string {
  return `PAYWALL_${network.toUpperCase().replace(/-/g, '_')}_RPC_URL`;
}

/**
 * RPC URL to embed in the paywall HTML that is sent to the browser.
 *
 * Everything returned here is public: anyone who opens a paywall page can read it.
 * It only reads `PAYWALL_<NETWORK>_RPC_URL` and never falls back to the server-side
 * `<NETWORK>_RPC_URL` variables, which hold private provider keys used for refunds.
 *
 * EVM networks return `undefined` when unset, so the paywall uses the chain's
 * default public RPC. Solana networks fall back to the public Solana endpoints.
 */
export function getPaywallRpcUrl(network: Network | string): string | undefined {
  const configured = process.env[paywallRpcEnvName(network)]?.trim();
  if (configured) return configured;
  if (network === 'solana' || network === 'solana-devnet') {
    return DEFAULT_SOLANA_PAYWALL_RPC[network];
  }
  return undefined;
}
