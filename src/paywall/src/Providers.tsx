import { OnchainKitProvider } from "@coinbase/onchainkit";
import type { ReactNode } from "react";
import {
  base,
  baseSepolia,
  avalanche,
  avalancheFuji,
  sei,
  seiTestnet,
  iotex,
  polygon,
  polygonAmoy,
  peaq,
  xLayer,
} from "viem/chains";
import { xLayerTestnet1952 } from "../../lib/chains";
import "./window.d.ts";

type ProvidersProps = {
  children: ReactNode;
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
  const paymentChain =
    network === "base-sepolia"
      ? baseSepolia
      : network === "avalanche-fuji"
      ? avalancheFuji
      : network === "sei-testnet"
      ? seiTestnet
      : network === "xlayer-testnet"
      ? xLayerTestnet1952
      : network === "sei"
      ? sei
      : network === "avalanche"
      ? avalanche
      : network === "iotex"
      ? iotex
      : network === "polygon"
      ? polygon
      : network === "polygon-amoy"
      ? polygonAmoy
      : network === "peaq"
      ? peaq
      : network === "xlayer"
      ? xLayer
      : base;

  console.log("paymentChain", paymentChain);
  console.log("network", network);
  return (
    <OnchainKitProvider
      apiKey={cdpClientKey || undefined}
      chain={paymentChain}
      config={{
        appearance: {
          mode: "light",
          theme: "hacker",
          name: appName || undefined,
          logo: appLogo || undefined,
        },
        wallet: {
          display: "modal",
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
