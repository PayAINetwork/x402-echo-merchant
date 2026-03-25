import type { PaymentRequirements } from './window.d';

/**
 * Safely clones an object without prototype pollution
 *
 * @param obj - The object to clone
 * @returns A safe clone of the object
 */
function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => safeClone(item)) as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj as Record<string, unknown>) {
    // Skip __proto__ and other dangerous properties
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = safeClone((obj as Record<string, unknown>)[key]);
    }
  }
  return cloned as T;
}

/**
 * Ensures a valid amount is set in payment requirements.
 *
 * The server already computes the correct atomic amount using the token's
 * actual decimals, so we only validate the field exists and is well-formed
 * rather than re-computing (which would break tokens with non-6 decimals).
 *
 * @param paymentRequirements - The payment requirements to validate
 * @returns Payment requirements with a guaranteed valid amount string
 */
export function ensureValidAmount(paymentRequirements: PaymentRequirements): PaymentRequirements {
  const updatedRequirements = safeClone(paymentRequirements);
  console.log('ENSURE VALID AMOUNT1', updatedRequirements);
  console.log('ENSURE VALID AMOUNT1', updatedRequirements.amount);
  if (!updatedRequirements.amount || !/^\d+$/.test(updatedRequirements.amount)) {
    updatedRequirements.amount = '10000';
  }
  console.log('ENSURE VALID AMOUNT2', updatedRequirements);
  console.log('ENSURE VALID AMOUNT2', updatedRequirements.amount);

  return updatedRequirements;
}

/**
 * Generates a session token for the user
 *
 * @param address - The user's connected wallet address
 * @returns The session token
 */
export const generateOnrampSessionToken = async (address: string): Promise<string | undefined> => {
  const endpoint = window.x402?.sessionTokenEndpoint;
  if (!endpoint) {
    return undefined;
  }

  // Call the session token API with user's address
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses: [
        {
          address,
          blockchains: ['base'], // Onramp only supports mainnet
        },
      ],
      assets: ['USDC'],
    }),
  });

  const data = await response.json();
  return data.token;
};
