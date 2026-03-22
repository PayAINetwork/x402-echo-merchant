import {
  declareEip2612GasSponsoringExtension,
  declareErc20ApprovalGasSponsoringExtension,
  EIP2612_GAS_SPONSORING,
  ERC20_APPROVAL_GAS_SPONSORING,
} from '@payai/x402-extensions';

/** Matches `RouteConfig.permit2GasSponsoring` in `x402-helpers.ts`. */
export type Permit2GasSponsoringMode = 'none' | 'eip2612' | 'erc20' | 'both';

/**
 * Merges server-side extension declarations for Permit2 gas sponsoring.
 * Only includes a declaration when the facilitator advertises the matching
 * extension key on `/supported` (so we never claim capabilities the facilitator lacks).
 */
export function mergePermit2GasSponsoringDeclarations(
  mode: Permit2GasSponsoringMode,
  facilitatorExtensionKeys: string[] | undefined
): Record<string, unknown> | undefined {
  if (mode === 'none') {
    return undefined;
  }

  const keys = new Set(facilitatorExtensionKeys ?? []);
  const merged: Record<string, unknown> = {};

  const includeEip2612 = mode === 'eip2612' || mode === 'both';
  const includeErc20 = mode === 'erc20' || mode === 'both';

  if (includeEip2612 && keys.has(EIP2612_GAS_SPONSORING.key)) {
    Object.assign(merged, declareEip2612GasSponsoringExtension());
  }
  if (includeErc20 && keys.has(ERC20_APPROVAL_GAS_SPONSORING.key)) {
    Object.assign(merged, declareErc20ApprovalGasSponsoringExtension());
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}
