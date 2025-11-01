import { OnchainKitProvider } from "@coinbase/onchainkit";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { base, baseSepolia, avalanche, avalancheFuji, sei, seiTestnet, iotex, polygon, polygonAmoy } from "viem/chains";
import "./window.d.ts";

type ProvidersProps = {
  children: ReactNode;
};

// Theme detection utility
const getInitialThemeMode = (): "light" | "dark" => {
  // Check localStorage for user preference (matches main app's storageKey)
  const storedTheme = localStorage.getItem("x402-theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme as "light" | "dark";
  }

  // Fall back to system preference
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
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
  const paymentChain = network === "base-sepolia"
    ? baseSepolia
    : network === "avalanche-fuji"
    ? avalancheFuji
    : network === "sei-testnet"
    ? seiTestnet
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
    : base;

  console.log("paymentChain", paymentChain);
  console.log("network", network);

  // Theme state management
  const [themeMode, setThemeMode] = useState<"light" | "dark">(getInitialThemeMode);

  useEffect(() => {
    // Listen for theme changes in localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "x402-theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setThemeMode(e.newValue);
      }
    };

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if no user preference is stored
      const storedTheme = localStorage.getItem("x402-theme");
      if (!storedTheme || (storedTheme !== "dark" && storedTheme !== "light")) {
        setThemeMode(e.matches ? "dark" : "light");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  return (
    <OnchainKitProvider
      apiKey={cdpClientKey || undefined}
      chain={paymentChain}
      config={{
        appearance: {
          mode: themeMode,
          theme: "hacker",
          name: appName || undefined,
          logo: appLogo || undefined,
        },
        wallet: {
          display: "modal",
          supportedWallets: {
            rabby: true,
            trust: true,
            frame: true
          },
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
