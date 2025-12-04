import type { Chain } from 'viem';

// OKX X Layer Testnet (chainId 1952) configuration.
// This is distinct from viem's X1 Testnet (195) and aligns wallet network,
// client chainId, and USDC configuration lookups used across the app.
export const xLayerTestnet1952: Chain = {
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testrpc.xlayer.tech/terigon', 'https://xlayertestrpc.okx.com/terigon'],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/x-layer-testnet',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 624344,
    },
  },
  testnet: true,
};


