import type { RouteConfig } from './x402-helpers';

export const BSC_TOKENS = {
  usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  usdt: '0x55d398326f99059fF775485246999027B3197955',
} as const;

export function bscRoute(symbol: keyof typeof BSC_TOKENS): RouteConfig {
  return {
    network: 'bsc',
    price: { amount: '10000000000000000', asset: { address: BSC_TOKENS[symbol], decimals: 18 } },
    assetTransferMethod: 'permit2',
    permit2GasSponsoring: 'none',
    permit2UserHint: 'A one-time token approval requires BNB. Subsequent payments only require a signature.',
    config: { description: `Pay 0.01 Binance-Peg ${symbol.toUpperCase()} on BNB Smart Chain and receive a refund.` },
  };
}
