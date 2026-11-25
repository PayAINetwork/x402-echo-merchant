import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPaywallRpcUrl, paywallRpcEnvName } from './paywallRpc';

// Ignore PAYWALL_*_RPC_URL values from the real environment (e.g. set in Vercel,
// where the build runs these tests) so default-value assertions stay deterministic.
beforeEach(() => {
  for (const name of Object.keys(process.env)) {
    if (/^PAYWALL_.+_RPC_URL$/.test(name)) vi.stubEnv(name, '');
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('paywallRpcEnvName', () => {
  it.each([
    ['base', 'PAYWALL_BASE_RPC_URL'],
    ['base-sepolia', 'PAYWALL_BASE_SEPOLIA_RPC_URL'],
    ['skale-base-sepolia', 'PAYWALL_SKALE_BASE_SEPOLIA_RPC_URL'],
    ['solana-devnet', 'PAYWALL_SOLANA_DEVNET_RPC_URL'],
  ])('%s -> %s', (network, name) => {
    expect(paywallRpcEnvName(network)).toBe(name);
  });
});

describe('getPaywallRpcUrl', () => {
  it('ignores server-only RPC variables for EVM networks', () => {
    vi.stubEnv('BASE_RPC_URL', 'https://base-mainnet.example/v2/secret');
    vi.stubEnv('AVALANCHE_RPC_URL', 'https://avax-mainnet.example/v2/secret');
    expect(getPaywallRpcUrl('base')).toBeUndefined();
    expect(getPaywallRpcUrl('avalanche')).toBeUndefined();
  });

  it('ignores server-only RPC variables for Solana and uses public endpoints', () => {
    vi.stubEnv('SOLANA_RPC_URL', 'https://solana-mainnet.example/v2/secret');
    vi.stubEnv('SOLANA_DEVNET_RPC_URL', 'https://solana-devnet.example/v2/secret');
    expect(getPaywallRpcUrl('solana')).toBe('https://solana-rpc.publicnode.com');
    expect(getPaywallRpcUrl('solana-devnet')).toBe('https://api.devnet.solana.com');
  });

  it('uses the explicit paywall RPC variable when set', () => {
    vi.stubEnv('PAYWALL_BASE_RPC_URL', ' https://public-base.example ');
    vi.stubEnv('PAYWALL_SOLANA_RPC_URL', 'https://public-solana.example');
    expect(getPaywallRpcUrl('base')).toBe('https://public-base.example');
    expect(getPaywallRpcUrl('solana')).toBe('https://public-solana.example');
  });

  it('treats a blank paywall RPC variable as unset', () => {
    vi.stubEnv('PAYWALL_BASE_RPC_URL', '   ');
    expect(getPaywallRpcUrl('base')).toBeUndefined();
  });
});
