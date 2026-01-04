/**
 * x402 Echo Merchant Helpers
 *
 * This file provides local utilities specific to the echo-merchant app.
 * Core x402 types and utilities are imported from the main packages.
 */

import { z } from 'zod';
import { createKeyPairSignerFromBytes, getBase58Encoder } from '@solana/kit';
import type { KeyPairSigner } from '@solana/kit';

import type { VerifyResponse } from '@payai/x402/types';
import { safeBase64Encode } from '@payai/x402/utils';

// =============================================================================
// Local Type Definitions
// =============================================================================

/**
 * Payment requirements for echo-merchant
 * Network uses CAIP-2 format (e.g., 'eip155:84532')
 */
export interface PaymentRequirements {
  scheme: string;
  network: string; // CAIP-2 format (e.g., 'eip155:84532')
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: Record<string, unknown>;
}

/**
 * Payment required response structure
 */
export interface PaymentRequired {
  x402Version: number;
  error?: string;
  resource?: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepts: PaymentRequirements[];
}

/**
 * Payment payload structure
 */
export interface PaymentPayload {
  x402Version: number;
  resource?: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepted?: PaymentRequirements;
  payload: Record<string, unknown>;
}

// =============================================================================
// Re-exports
// =============================================================================

export { safeBase64Encode };
export type { VerifyResponse };

// =============================================================================
// Network Mapping
// =============================================================================

/**
 * Maps network names to CAIP-2 format
 */
export const NETWORK_TO_CAIP2: Record<string, string> = {
  // EVM networks
  base: 'eip155:8453',
  'base-sepolia': 'eip155:84532',
  avalanche: 'eip155:43114',
  'avalanche-fuji': 'eip155:43113',
  polygon: 'eip155:137',
  'polygon-amoy': 'eip155:80002',
  sei: 'eip155:1329',
  'sei-testnet': 'eip155:713715',
  xlayer: 'eip155:196',
  'xlayer-testnet': 'eip155:1952',
  peaq: 'eip155:3338',
  iotex: 'eip155:4689',
  'skale-base': 'eip155:1187947933',
  'skale-base-sepolia': 'eip155:324705682',
  // SVM networks
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  'solana-devnet': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
};

/**
 * Maps CAIP-2 network identifiers back to friendly names for display
 */
export const CAIP2_TO_NETWORK: Record<string, string> = Object.fromEntries(
  Object.entries(NETWORK_TO_CAIP2).map(([k, v]) => [v, k])
);

/**
 * Supported EVM networks (used for route matching)
 */
export const SupportedEVMNetworks = [
  'base',
  'base-sepolia',
  'avalanche',
  'avalanche-fuji',
  'polygon',
  'polygon-amoy',
  'sei',
  'sei-testnet',
  'xlayer',
  'xlayer-testnet',
  'peaq',
  'iotex',
  'skale-base',
  'skale-base-sepolia',
] as const;

/**
 * Supported SVM networks (used for route matching)
 */
export const SupportedSVMNetworks = ['solana', 'solana-devnet'] as const;

// Network type for route configuration (converted to CAIP-2 internally)
export type Network = string;

// =============================================================================
// Local Type Definitions
// =============================================================================

export interface FacilitatorConfig {
  url: `${string}://${string}`;
  createAuthHeaders?: () => Promise<{
    verify?: Record<string, string>;
    settle?: Record<string, string>;
  }>;
}

export interface RouteConfig {
  price: Price;
  network: Network;
  config?: {
    description?: string;
    mimeType?: string;
    maxTimeoutSeconds?: number;
    outputSchema?: unknown;
    customPaywallHtml?: string;
    resource?: string;
    discoverable?: boolean;
    inputSchema?: unknown;
    errorMessages?: {
      verificationFailed?: string;
      settlementFailed?: string;
    };
  };
}

export type RoutesConfig = Record<string, RouteConfig>;

export type Price = string | number | ERC20TokenAmount;

export interface ERC20TokenAmount {
  amount: string;
  asset: {
    address: string;
    decimals: number;
    eip712?: {
      name: string;
      version: string;
    };
  };
}

export type Resource = `${string}://${string}${string}`;

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for parsing money values (e.g., "$0.01" -> 0.01)
 */
export const moneySchema = z.union([
  z.string().transform(val => {
    if (val.startsWith('$')) {
      return parseFloat(val.slice(1));
    }
    return parseFloat(val);
  }),
  z.number(),
]);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Safely converts an object to JSON, handling BigInt values
 */
export function toJsonSafe<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toJsonSafe(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = toJsonSafe((obj as Record<string, unknown>)[key]);
      }
    }
    return result as T;
  }

  return obj;
}

// =============================================================================
// Route Matching
// =============================================================================

export interface CompiledRoutePattern {
  pattern: RegExp;
  verbs: Set<string>;
  config: RouteConfig;
  originalPath: string;
}

/**
 * Compiles route patterns from routes config into regex patterns
 */
export function computeRoutePatterns(routes: RoutesConfig): CompiledRoutePattern[] {
  const patterns: CompiledRoutePattern[] = [];

  for (const [path, config] of Object.entries(routes)) {
    const verbMatch = path.match(/^([A-Z,]+):(.+)$/);
    let verbs: Set<string>;
    let routePath: string;

    if (verbMatch) {
      verbs = new Set(verbMatch[1].split(','));
      routePath = verbMatch[2];
    } else {
      verbs = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
      routePath = path;
    }

    const regexPattern = routePath.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');

    patterns.push({
      pattern: new RegExp(`^${regexPattern}$`),
      verbs,
      config,
      originalPath: path,
    });
  }

  return patterns;
}

/**
 * Finds the matching route for a given pathname and method
 */
export function findMatchingRoute(
  patterns: CompiledRoutePattern[],
  pathname: string,
  method: string
): CompiledRoutePattern | undefined {
  return patterns.find(p => p.pattern.test(pathname) && p.verbs.has(method.toUpperCase()));
}

/**
 * Finds payment requirements matching the decoded payment
 * Matches by scheme and network from the `accepted` field
 */
export function findMatchingPaymentRequirements(
  requirements: PaymentRequirements[],
  decodedPayment: PaymentPayload
): PaymentRequirements | undefined {
  const accepted = decodedPayment.accepted;
  if (accepted) {
    return requirements.find(
      req => req.scheme === accepted.scheme && req.network === accepted.network
    );
  }
  // Fallback: check for properties at the top level
  const payloadAny = decodedPayment as unknown as Record<string, unknown>;
  const scheme = (payloadAny.scheme as string) || 'exact';
  const network = payloadAny.network as string;
  return requirements.find(req => req.scheme === scheme && req.network === network);
}

// =============================================================================
// Price Processing
// =============================================================================

// USDC addresses per network
const USDC_ADDRESSES: Record<
  string,
  { address: string; decimals: number; name: string; version: string }
> = {
  base: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    name: 'USD Coin',
    version: '2',
  },
  'base-sepolia': {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  avalanche: {
    address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    decimals: 6,
    name: 'USD Coin',
    version: '2',
  },
  'avalanche-fuji': {
    address: '0x5425890298aed601595a70AB815c96711a31Bc65',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  sei: {
    address: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  'sei-testnet': {
    address: '0x4E4a29f76cD0dFf2A4e5E56d7a065E0aF33f32e2',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  polygon: {
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    name: 'USD Coin',
    version: '2',
  },
  'polygon-amoy': {
    address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  peaq: {
    address: '0x7A98288740407E1A0db5E18C4BE9a6F42FE77e40',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  iotex: {
    address: '0x3B2bf2b523f54C4E454F08Aa286D03115aFF326c',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  xlayer: {
    address: '0x74b7F16337b8972027F6196A17a631aC6dE26d22',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  'xlayer-testnet': {
    address: '0xcb8bf24c6ce16ad21d707c9505421a17f2bec79d',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
  'skale-base': {
    address: '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20',
    decimals: 6,
    name: 'Bridged USDC (SKALE Bridge)',
    version: '2',
  },
  'skale-base-sepolia': {
    address: '0x2e08028E3C4c2356572E096d8EF835cD5C6030bD',
    decimals: 6,
    name: 'Bridged USDC (SKALE Bridge)',
    version: '2',
  },
  solana: {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    name: 'USD Coin',
    version: '2',
  },
  'solana-devnet': {
    address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    decimals: 6,
    name: 'USDC',
    version: '2',
  },
};

/**
 * Processes a price value into atomic amount and asset details
 */
export function processPriceToAtomicAmount(
  price: Price,
  network: Network
): { amount: string; asset: ERC20TokenAmount['asset'] } | { error: string } {
  let decimals: number;
  let address: string;
  let eip712: { name: string; version: string } | undefined;

  if (typeof price === 'string' || typeof price === 'number') {
    const parsed = moneySchema.safeParse(price);
    if (!parsed.success) {
      return { error: `Invalid price format: ${price}` };
    }

    const usdcInfo = USDC_ADDRESSES[network];
    if (!usdcInfo) {
      return { error: `No USDC address configured for network: ${network}` };
    }

    decimals = usdcInfo.decimals;
    address = usdcInfo.address;
    eip712 = { name: usdcInfo.name, version: usdcInfo.version };

    const atomicAmount = Math.round(parsed.data * Math.pow(10, decimals));
    return {
      amount: atomicAmount.toString(),
      asset: { address, decimals, eip712 },
    };
  } else {
    return {
      amount: price.amount,
      asset: price.asset,
    };
  }
}

// =============================================================================
// Solana Signer Creation
// =============================================================================

export type Signer = KeyPairSigner;

/**
 * Creates a Solana signer from a private key
 */
export async function createSigner(network: Network, privateKey: string): Promise<Signer> {
  if (network !== 'solana' && network !== 'solana-devnet') {
    throw new Error(`createSigner only supports Solana networks, got: ${network}`);
  }

  const encoder = getBase58Encoder();
  const keyBytes = encoder.encode(privateKey);
  return await createKeyPairSignerFromBytes(keyBytes);
}

// =============================================================================
// Facilitator Helpers
// =============================================================================

/**
 * Payment kind from the facilitator's /supported endpoint
 */
export interface PaymentKind {
  network: string;
  scheme: string;
  x402Version?: number;
  extra?: { feePayer?: string; [key: string]: unknown };
}

export interface FacilitatorHooks {
  verify: (
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements
  ) => Promise<VerifyResponse>;
  settle: (
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements
  ) => Promise<{
    success: boolean;
    transaction?: string;
    network?: string;
    payer?: string;
    errorReason?: string;
  }>;
  /**
   * Fetches supported payment kinds from the facilitator.
   * Returns only V2 kinds (CAIP-2 network format) for V2 protocol compatibility.
   */
  supported: () => Promise<{
    kinds: PaymentKind[];
    extensions?: string[];
    signers?: Record<string, string[]>;
  }>;
}

/**
 * Creates facilitator hooks for verifying and settling payments
 */
export function useFacilitator(config?: FacilitatorConfig): FacilitatorHooks {
  const baseUrl = config?.url || 'https://x402.org/facilitator';

  const getHeaders = async (type: 'verify' | 'settle'): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config?.createAuthHeaders) {
      const authHeaders = await config.createAuthHeaders();
      if (type === 'verify' && authHeaders.verify) {
        Object.assign(headers, authHeaders.verify);
      } else if (type === 'settle' && authHeaders.settle) {
        Object.assign(headers, authHeaders.settle);
      }
    }
    return headers;
  };

  return {
    verify: async (paymentPayload, paymentRequirements) => {
      const headers = await getHeaders('verify');
      const res = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          x402Version: paymentPayload.x402Version,
          paymentPayload: toJsonSafe(paymentPayload),
          paymentRequirements: toJsonSafe(paymentRequirements),
        }),
      });
      return res.json();
    },

    settle: async (paymentPayload, paymentRequirements) => {
      const headers = await getHeaders('settle');
      const res = await fetch(`${baseUrl}/settle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          x402Version: paymentPayload.x402Version,
          paymentPayload: toJsonSafe(paymentPayload),
          paymentRequirements: toJsonSafe(paymentRequirements),
        }),
      });
      return res.json();
    },

    supported: async () => {
      const res = await fetch(`${baseUrl}/supported`);
      const data = await res.json();

      // Support both response formats:
      // 1. Current: flat array with x402Version on each kind
      // 2. Future: grouped object { '1': [...], '2': [...] }
      let v2Kinds: PaymentKind[];

      if (Array.isArray(data.kinds)) {
        // Flat array format - filter for V2 kinds (x402Version === 2)
        v2Kinds = data.kinds.filter((kind: PaymentKind) => kind.x402Version === 2);
      } else if (data.kinds && typeof data.kinds === 'object') {
        // Grouped format - extract V2 kinds directly
        v2Kinds = data.kinds['2'] ?? [];
      } else {
        v2Kinds = [];
      }

      return {
        kinds: v2Kinds,
        extensions: data.extensions,
        signers: data.signers,
      };
    },
  };
}

// =============================================================================
// Payment Decoding
// =============================================================================

/**
 * Decodes a PAYMENT-SIGNATURE header (base64 encoded JSON)
 */
export function decodePayment(paymentHeader: string): PaymentPayload {
  let decoded: string;
  if (typeof atob !== 'undefined') {
    decoded = atob(paymentHeader);
  } else {
    decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
  }
  return JSON.parse(decoded) as PaymentPayload;
}
