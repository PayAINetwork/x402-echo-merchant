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

/**
 * SKALE Base Mainnet chain definition.
 * Chain ID: 1187947933
 * Documentation: https://docs.skale.space/get-started/quick-start/skale-on-base#skale-base-mainnet
 */
export const skaleBase: Chain = {
  id: 1187947933,
  name: 'SKALE Base',
  nativeCurrency: {
    name: 'Credits',
    symbol: 'CREDIT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://skale-base.skalenodes.com/v1/base'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://skale-base-explorer.skalenodes.com',
    },
  },
};

/**
 * SKALE Base Sepolia Testnet chain definition.
 * Chain ID: 324705682
 * Documentation: https://docs.skale.space/get-started/quick-start/skale-on-base#skale-base-testnet
 */
export const skaleBaseSepolia: Chain = {
  id: 324705682,
  name: 'SKALE Base Sepolia',
  nativeCurrency: {
    name: 'Credits',
    symbol: 'CREDITS',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://base-sepolia-testnet-explorer.skalenodes.com',
    },
  },
  testnet: true,
};


