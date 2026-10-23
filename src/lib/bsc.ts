import type { RouteConfig } from './x402-helpers';

export const BSC_USDC = {
  bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  'bsc-testnet': '0x64544969ed7EBf5f083679233325356EbE738930',
} as const;

export function bscRoute(network: keyof typeof BSC_USDC): RouteConfig {
  const testnet = network === 'bsc-testnet';
  return {
    network,
    price: { amount: '10000000000000000', asset: { address: BSC_USDC[network], decimals: 18 } },
    assetTransferMethod: 'permit2',
    permit2GasSponsoring: 'none',
    permit2UserHint: `A one-time token approval requires ${testnet ? 'testnet BNB' : 'BNB'}. Subsequent payments only require a signature.`,
    config: { description: testnet
      ? 'Pay 0.01 test USDC on BNB Smart Chain Testnet and receive a refund.'
      : 'Pay 0.01 Binance-Peg USDC on BNB Smart Chain and receive a refund.' },
  };
}
