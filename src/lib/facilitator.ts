/**
 * Facilitator Hooks for x402 Payment Verification and Settlement
 *
 * Provides hooks for verifying and settling payments via the PayAI facilitator.
 * Automatically uses JWT authentication when PAYAI_API_KEY_ID and PAYAI_API_KEY_SECRET
 * env vars are set (or passed via config), bypassing free tier limits.
 */

import { getOrGenerateJwt } from './jwtUtils';
import {
  toJsonSafe,
  type FacilitatorHooks,
  type PaymentKind,
  type PaymentPayload,
  type PaymentRequirements,
  type VerifyResponse,
} from './x402-helpers';

// =============================================================================
// Public Types
// =============================================================================

/**
 * Configuration for the facilitator client.
 */
export interface FacilitatorConfig {
  /** Base URL of the facilitator service */
  url?: `${string}://${string}`;

  /** API Key ID for JWT authentication (bypasses free tier limits) */
  apiKeyId?: string;

  /**
   * API Key Secret for JWT authentication (Ed25519 private key in PKCS#8/DER format).
   *
   * Accepted formats:
   * - Raw base64: "<base64>"
   * - PayAI-prefixed format: "payai_sk_<base64>"
   */
  apiKeySecret?: string;

  /**
   * Custom auth headers for verify/settle requests.
   * Use this for more complex authentication scenarios.
   */
  createAuthHeaders?: () => Promise<{
    verify?: Record<string, string>;
    settle?: Record<string, string>;
  }>;
}

// Re-export FacilitatorHooks for convenience
export type { FacilitatorHooks };

// =============================================================================
// Private Types
// =============================================================================

/** Response shape for facilitator errors */
interface FacilitatorErrorResponse {
  error?: string;
  invalidReason?: string;
  invalidMessage?: string;
  errorReason?: string;
  errorMessage?: string;
  message?: string;
}

/** Response shape for /supported endpoint */
interface SupportedResponse {
  kinds: PaymentKind[] | Record<string, PaymentKind[]>;
  extensions?: string[];
  signers?: Record<string, string[]>;
}

// =============================================================================
// Private Helpers
// =============================================================================

/** Safely parse JSON from a response, returning null on failure */
async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Extracts error message from facilitator responses, checking common error fields.
 */
function extractErrorMessage(data: FacilitatorErrorResponse | null, fallback: string): string {
  if (!data) return fallback;

  // Check various error fields in order of preference
  if (data.error) return data.error;
  if (data.invalidReason) {
    return data.invalidMessage
      ? `${data.invalidReason}: ${data.invalidMessage}`
      : data.invalidReason;
  }
  if (data.errorReason) {
    return data.errorMessage ? `${data.errorReason}: ${data.errorMessage}` : data.errorReason;
  }
  if (data.message) return data.message;

  return fallback;
}

// =============================================================================
// Facilitator Hook
// =============================================================================

/**
 * Creates facilitator hooks for verifying and settling payments.
 *
 * @example
 * // Basic usage (free tier)
 * const { verify, settle } = useFacilitator();
 *
 * @example
 * // With API credentials (bypasses free tier limits)
 * const { verify, settle } = useFacilitator({
 *   url: 'https://x402.org/facilitator',
 *   apiKeyId: 'my-key-id',
 *   apiKeySecret: 'my-secret',
 * });
 */
export function useFacilitator(config?: FacilitatorConfig): FacilitatorHooks {
  const baseUrl = config?.url || 'https://x402.org/facilitator';
  const apiKeyId = config?.apiKeyId;
  const apiKeySecret = config?.apiKeySecret;

  const getHeaders = async (type: 'verify' | 'settle'): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Add JWT auth if credentials are available
    if (apiKeyId && apiKeySecret) {
      const jwt = await getOrGenerateJwt({ apiKeyId, apiKeySecret });
      headers['Authorization'] = `Bearer ${jwt}`;
    }

    // Apply custom auth headers if provided
    if (config?.createAuthHeaders) {
      const authHeaders = await config.createAuthHeaders();
      const typeHeaders = type === 'verify' ? authHeaders.verify : authHeaders.settle;
      if (typeHeaders) Object.assign(headers, typeHeaders);
    }

    return headers;
  };

  return {
    verify: async (paymentPayload, paymentRequirements) => {
      const res = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: await getHeaders('verify'),
        body: JSON.stringify({
          x402Version: paymentPayload.x402Version,
          paymentPayload: toJsonSafe(paymentPayload),
          paymentRequirements: toJsonSafe(paymentRequirements),
        }),
      });

      const data = await safeJson<VerifyResponse | FacilitatorErrorResponse>(res);

      // Return x402 VerifyResponse payloads as-is when available
      if (data && 'isValid' in data && typeof data.isValid === 'boolean') {
        return data as VerifyResponse;
      }

      return {
        isValid: false,
        invalidReason: extractErrorMessage(
          data as FacilitatorErrorResponse,
          `facilitator_verify_http_${res.status}`
        ),
      };
    },

    settle: async (paymentPayload, paymentRequirements) => {
      const res = await fetch(`${baseUrl}/settle`, {
        method: 'POST',
        headers: await getHeaders('settle'),
        body: JSON.stringify({
          x402Version: paymentPayload.x402Version,
          paymentPayload: toJsonSafe(paymentPayload),
          paymentRequirements: toJsonSafe(paymentRequirements),
        }),
      });

      type SettleResponse = {
        success: boolean;
        transaction?: string;
        network?: string;
        payer?: string;
        errorReason?: string;
      };

      const data = await safeJson<SettleResponse | FacilitatorErrorResponse>(res);

      // Return settle response payloads as-is when available
      if (data && 'success' in data && typeof data.success === 'boolean') {
        return data as SettleResponse;
      }

      return {
        success: false,
        errorReason: extractErrorMessage(
          data as FacilitatorErrorResponse,
          `facilitator_settle_http_${res.status}`
        ),
      };
    },

    supported: async () => {
      const res = await fetch(`${baseUrl}/supported`);
      const data = await safeJson<SupportedResponse | FacilitatorErrorResponse>(res);

      if (!res.ok) {
        throw new Error(
          extractErrorMessage(
            data as FacilitatorErrorResponse,
            `facilitator_supported_http_${res.status}`
          )
        );
      }

      if (!data || !('kinds' in data)) {
        return { kinds: [] };
      }

      // Handle both flat array and grouped object formats
      const kinds = Array.isArray(data.kinds)
        ? data.kinds.filter(kind => kind.x402Version === 2)
        : (data.kinds['2'] ?? []);

      return {
        kinds,
        extensions: data.extensions,
        signers: data.signers,
      };
    },
  };
}
