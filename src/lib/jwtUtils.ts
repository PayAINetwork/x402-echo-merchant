/**
 * JWT Utilities for PayAI API Key Authentication
 *
 * Provides Ed25519 (EdDSA) JWT generation for authenticating with the PayAI facilitator.
 * JWTs are used as Bearer tokens for credit-based access (bypassing free tier limits).
 *
 * Uses Web Crypto API for Edge Runtime compatibility (works in Node.js, Edge, and browsers).
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Options for generating a PayAI API key JWT.
 */
export interface PayAIJwtOptions {
  /** API Key ID (the `kid` in JWT header, `sub` in payload) */
  apiKeyId: string;
  /**
   * API Key Secret (Ed25519 private key in PKCS#8/DER format).
   *
   * Accepted formats:
   * - Raw base64 (recommended for env vars): "<base64>"
   * - PayAI-prefixed format (as shown in the merchant portal UI): "payai_sk_<base64>"
   */
  apiKeySecret: string;
  /** JWT expiration in seconds (default: 120) */
  expiresIn?: number;
  /** Issuer claim (default: 'payai-merchant') */
  issuer?: string;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Base64URL encode a Uint8Array (JWT-safe encoding without padding).
 */
function base64UrlEncode(data: Uint8Array): string {
  // Convert to regular base64 first
  let base64 = '';
  const bytes = new Uint8Array(data);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }
  base64 = btoa(base64);

  // Convert to base64url (replace + with -, / with _, remove padding)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL encode a string.
 */
function base64UrlEncodeString(str: string): string {
  const encoder = new TextEncoder();
  return base64UrlEncode(encoder.encode(str));
}

/**
 * Decode base64 string to Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Handle base64url format (convert back to regular base64)
  const base64Standard = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(base64Standard);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Normalize API key secret strings into raw base64.
 *
 * The merchant portal returns secrets in the "payai_sk_<base64>" format to make it obvious
 * this value is sensitive. Our JWT signer expects raw base64, so we strip the prefix when present.
 */
function normalizeApiKeySecret(apiKeySecret: string): string {
  const trimmed = apiKeySecret.trim();
  return trimmed.startsWith('payai_sk_') ? trimmed.slice('payai_sk_'.length) : trimmed;
}

/**
 * Generate a UUID v4 using crypto.randomUUID() or fallback.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// JWT Generation
// =============================================================================

/**
 * Generates a JWT for PayAI API key authentication.
 *
 * Uses Ed25519 (EdDSA) signing via Web Crypto API, matching the PayAI facilitator's verification.
 * The generated JWT can be used as a Bearer token for credit-based access.
 *
 * @example
 * const jwt = await generatePayAIApiKeyJwt({
 *   apiKeyId: process.env.PAYAI_API_KEY_ID!,
 *   apiKeySecret: process.env.PAYAI_API_KEY_SECRET!,
 * });
 *
 * @param options - JWT generation options
 * @returns The signed JWT string
 * @throws Error if key format is invalid or signing fails
 */
export async function generatePayAIApiKeyJwt(options: PayAIJwtOptions): Promise<string> {
  const { apiKeyId, apiKeySecret, expiresIn = 120, issuer = 'payai-merchant' } = options;

  if (!apiKeyId || !apiKeySecret) {
    throw new Error('apiKeyId and apiKeySecret are required');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresIn;

  // JWT Header
  const header = {
    alg: 'EdDSA',
    typ: 'JWT',
    kid: apiKeyId,
  };

  // JWT Payload
  const payload = {
    sub: apiKeyId,
    iss: issuer,
    iat: now,
    exp: exp,
    jti: generateUUID(), // Nonce for replay protection
  };

  // Encode header and payload
  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;

  // Parse the private key and sign
  try {
    const secretBase64 = normalizeApiKeySecret(apiKeySecret);
    const keyBytes = base64ToUint8Array(secretBase64);

    // Import the Ed25519 private key (PKCS#8 DER format)
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBytes.buffer as ArrayBuffer,
      { name: 'Ed25519' },
      false,
      ['sign']
    );

    // Sign the message
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signatureBuffer = await crypto.subtle.sign(
      'Ed25519',
      privateKey,
      messageBytes.buffer as ArrayBuffer
    );
    const signatureB64 = base64UrlEncode(new Uint8Array(signatureBuffer));

    return `${message}.${signatureB64}`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to sign JWT: ${msg}. Ensure apiKeySecret is a valid base64-encoded Ed25519 private key in PKCS#8 format.`
    );
  }
}

// =============================================================================
// JWT Caching
// =============================================================================

interface CachedJwt {
  token: string;
  expiresAt: number;
}

let jwtCache: CachedJwt | null = null;

/**
 * Gets or generates a PayAI API key JWT with caching.
 * Reuses cached JWT until 30 seconds before expiry to minimize signing operations.
 *
 * @param options - JWT generation options
 * @returns The JWT string (possibly cached)
 */
export async function getOrGenerateJwt(options: PayAIJwtOptions): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = 30; // Regenerate 30s before expiry

  // Return cached token if still valid
  if (jwtCache && jwtCache.expiresAt > now + bufferSeconds) {
    return jwtCache.token;
  }

  // Generate new token
  const expiresIn = options.expiresIn ?? 120;
  const token = await generatePayAIApiKeyJwt(options);

  // Cache it
  jwtCache = {
    token,
    expiresAt: now + expiresIn,
  };

  return token;
}

/**
 * Clears the JWT cache. Useful for testing or when rotating keys.
 */
export function clearJwtCache(): void {
  jwtCache = null;
}
