import { OnchainKitProvider } from '@coinbase/onchainkit';
import type { Chain } from 'viem';
import type { ReactNode } from 'react';
import {
  base,
  baseSepolia,
  avalanche,
  avalancheFuji,
  sei,
  seiTestnet,
  polygon,
  polygonAmoy,
  xLayer,
  arbitrum,
  arbitrumSepolia,
} from 'viem/chains';
import { xLayerTestnet1952, skaleBase, skaleBaseSepolia } from '../../lib/chains';
import './window.d.ts';

type ProvidersProps = {
  children: ReactNode;
};

// Merchant middleware writes payment requirements in V2 CAIP-2 form
// (e.g. "eip155:8453"), so the chain lookup is keyed by chain id.
const CHAIN_BY_CAIP2: Record<string, Chain> = {
  'eip155:8453': base,
  'eip155:84532': baseSepolia,
  'eip155:43114': avalanche,
  'eip155:43113': avalancheFuji,
  'eip155:1329': sei,
  'eip155:713715': seiTestnet,
  'eip155:137': polygon,
  'eip155:80002': polygonAmoy,
  'eip155:196': xLayer,
  'eip155:1952': xLayerTestnet1952,
  'eip155:1187947933': skaleBase,
  'eip155:324705682': skaleBaseSepolia,
  'eip155:42161': arbitrum,
  'eip155:421614': arbitrumSepolia,
};

/**
 * Providers component for the paywall
 *
 * @param props - The component props
 * @param props.children - The children of the Providers component
 * @returns The Providers component
 */
export function Providers({ children }: ProvidersProps) {
  const { cdpClientKey, appName, appLogo } = window.x402;
  const requirements = Array.isArray(window.x402.paymentRequirements)
    ? window.x402.paymentRequirements[0]
    : window.x402.paymentRequirements;

  const network = requirements?.network;
  const paymentChain = (network && CHAIN_BY_CAIP2[network]) || base;

  console.log('paymentChain', paymentChain);
  console.log('network', network);
  return (
    <OnchainKitProvider
      apiKey={cdpClientKey || undefined}
      chain={paymentChain}
      config={{
        appearance: {
          mode: 'light',
          theme: 'hacker',
          name: appName || undefined,
          logo: appLogo || undefined,
        },
        wallet: {
          display: 'modal',
          supportedWallets: {
            rabby: true,
            trust: true,
            frame: true,
          },
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
