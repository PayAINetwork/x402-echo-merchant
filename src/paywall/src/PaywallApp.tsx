/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FundButton, getOnrampBuyUrl } from "@coinbase/onchainkit/fund";
import { Avatar, Name } from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  publicActions,
} from "viem";
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
} from "viem/chains";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";

import { selectPaymentRequirements } from "x402/client";
import { exact } from "x402/schemes";
import { getUSDCBalance } from "x402/shared/evm";

import { Spinner } from "./Spinner";
import { useOnrampSessionToken } from "./useOnrampSessionToken";
import { ensureValidAmount } from "./utils";

// Theme detection utility
const getInitialThemeMode = (): "light" | "dark" => {
  // Check localStorage for user preference (matches main app's storageKey)
  const storedTheme = localStorage.getItem("x402-theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme as "light" | "dark";
  }

  // Fall back to system preference
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

/**
 * Main Paywall App Component
 *
 * @returns The PaywallApp component
 */
export function PaywallApp() {
  const { address, isConnected, chainId: connectedChainId } = useAccount();
  const { switchChainAsync, chains: switchableChains } = useSwitchChain();
  const { data: wagmiWalletClient } = useWalletClient();
  const { sessionToken } = useOnrampSessionToken(address);

  const [status, setStatus] = useState<string>("");
  const [isCorrectChain, setIsCorrectChain] = useState<boolean | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [formattedUsdcBalance, setFormattedUsdcBalance] = useState<string>("");
  const [hideBalance, setHideBalance] = useState(true);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    getInitialThemeMode
  );

  const x402 = window.x402;
  const amount = x402.amount || 0;
  const testnet = x402.testnet ?? true;
  const requirements = Array.isArray(x402.paymentRequirements)
    ? x402.paymentRequirements[0]
    : x402.paymentRequirements;
  const network = requirements?.network;
  const paymentChain =
    network === "base-sepolia"
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
      : network === "peaq"
      ? peaq
      : base;

  const chainName =
    network === "base-sepolia"
      ? "Base Sepolia"
      : network === "avalanche-fuji"
      ? "Avalanche Fuji"
      : network === "sei-testnet"
      ? "Sei Testnet"
      : network === "sei"
      ? "Sei"
      : network === "avalanche"
      ? "Avalanche"
      : network === "iotex"
      ? "Iotex"
      : network === "polygon"
      ? "Polygon"
      : network === "polygon-amoy"
      ? "Polygon Amoy"
      : network === "peaq"
      ? "Peaq"
      : "Base";
  const showOnramp = Boolean(
    !testnet && isConnected && x402.sessionTokenEndpoint
  );

  useEffect(() => {
    if (address) {
      handleSwitchChain();
      checkUSDCBalance();
    }
  }, [address]);

  // Apply initial theme to document on mount
  useEffect(() => {
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Theme detection and application
  useEffect(() => {
    const applyTheme = (theme: "light" | "dark") => {
      setThemeMode(theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Apply initial theme to document
    applyTheme(themeMode);

    // Listen for theme changes in localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "x402-theme" &&
        (e.newValue === "dark" || e.newValue === "light")
      ) {
        applyTheme(e.newValue);
      }
    };

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const storedTheme = localStorage.getItem("x402-theme");
      if (!storedTheme || (storedTheme !== "dark" && storedTheme !== "light")) {
        applyTheme(e.matches ? "dark" : "light");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

  const publicClient = createPublicClient({
    chain: paymentChain,
    transport: http(),
  }).extend(publicActions);

  const paymentRequirements = x402
    ? selectPaymentRequirements(
        [x402.paymentRequirements].flat(),
        network,
        "exact"
      )
    : null;

  useEffect(() => {
    if (isConnected && paymentChain.id === connectedChainId) {
      setIsCorrectChain(true);
      setStatus("");
    } else if (isConnected && paymentChain.id !== connectedChainId) {
      setIsCorrectChain(false);
      setStatus(`On the wrong network. Please switch to ${chainName}.`);
    } else {
      setIsCorrectChain(null);
      setStatus("");
    }
  }, [paymentChain.id, connectedChainId, isConnected]);

  const checkUSDCBalance = useCallback(async () => {
    if (!address) {
      return;
    }
    const balance = await getUSDCBalance(publicClient, address);
    const formattedBalance = formatUnits(balance, 6);
    setFormattedUsdcBalance(formattedBalance);
  }, [address, publicClient]);

  const onrampBuyUrl = useMemo(() => {
    if (!sessionToken) {
      return;
    }
    return getOnrampBuyUrl({
      presetFiatAmount: 2,
      fiatCurrency: "USD",
      sessionToken,
    });
  }, [sessionToken]);

  const handleSuccessfulResponse = useCallback(async (response: Response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      document.documentElement.innerHTML = await response.text();
    } else {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.location.href = url;
    }
  }, []);

  const handleSwitchChain = useCallback(async () => {
    if (isCorrectChain) {
      return;
    }

    if (!switchableChains?.some((c) => c.id === paymentChain.id)) {
      try {
        const ethereum: any = (window as any)?.ethereum;
        if (!ethereum?.request) {
          setStatus(
            "Your wallet doesn't support adding networks. Please add it manually."
          );
          return;
        }
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${paymentChain.id.toString(16)}`,
              chainName,
              nativeCurrency: paymentChain.nativeCurrency,
              rpcUrls: paymentChain.rpcUrls?.default?.http || [],
              blockExplorerUrls: paymentChain.blockExplorers?.default
                ? [paymentChain.blockExplorers.default.url]
                : [],
            },
          ],
        });
      } catch (addErr) {
        setStatus(
          addErr instanceof Error
            ? addErr.message
            : "Failed to add network. Please add it in your wallet and try again."
        );
        return;
      }
    }

    try {
      setStatus("");
      await switchChainAsync({ chainId: paymentChain.id });
      // Small delay to let wallet settle
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to switch network"
      );
    }
  }, [switchChainAsync, paymentChain, isCorrectChain, switchableChains]);

  const handlePayment = useCallback(async () => {
    if (!address || !x402 || !paymentRequirements) {
      return;
    }

    await handleSwitchChain();

    // Prefer wagmi's wallet client; fallback to EIP-1193 provider if available
    let walletClientForSigning: any = wagmiWalletClient?.extend(publicActions);
    if (!walletClientForSigning) {
      try {
        const ethereum: any = (window as any)?.ethereum;
        if (!ethereum?.request) {
          setStatus(
            "No wallet provider found. Please open your wallet and reconnect."
          );
          return;
        }
        walletClientForSigning = createWalletClient({
          chain: paymentChain,
          transport: custom(ethereum),
          account: address as `0x${string}`,
        }).extend(publicActions);
      } catch (e) {
        setStatus(
          e instanceof Error
            ? e.message
            : "Wallet client not available. Please reconnect your wallet."
        );
        return;
      }
    }

    setIsPaying(true);

    try {
      setStatus("Checking USDC balance...");
      const balance = await getUSDCBalance(publicClient, address);

      if (balance === BigInt(0)) {
        throw new Error(
          `Insufficient balance. Make sure you have USDC on ${chainName}`
        );
      }

      setStatus("Creating payment signature...");
      const validPaymentRequirements = ensureValidAmount(paymentRequirements);
      const initialPayment = await exact.evm.createPayment(
        walletClientForSigning,
        1,
        validPaymentRequirements
      );

      const paymentHeader: string = exact.evm.encodePayment(initialPayment);

      setStatus("Requesting content with payment...");
      const response = await fetch(x402.currentUrl, {
        headers: {
          "X-PAYMENT": paymentHeader,
          "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
        },
      });

      if (response.ok) {
        await handleSuccessfulResponse(response);
      } else if (response.status === 402) {
        // Try to parse error data, fallback to empty object if parsing fails
        const errorData = await response.json().catch(() => ({}));
        if (errorData && typeof errorData.x402Version === "number") {
          // Retry with server's x402Version
          const retryPayment = await exact.evm.createPayment(
            walletClientForSigning,
            errorData.x402Version,
            validPaymentRequirements
          );

          retryPayment.x402Version = errorData.x402Version;
          const retryHeader = exact.evm.encodePayment(retryPayment);
          const retryResponse = await fetch(x402.currentUrl, {
            headers: {
              "X-PAYMENT": retryHeader,
              "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
            },
          });
          if (retryResponse.ok) {
            await handleSuccessfulResponse(retryResponse);
            return;
          } else {
            throw new Error(
              `Payment retry failed: ${retryResponse.statusText}`
            );
          }
        } else {
          throw new Error(`Payment failed: ${response.statusText}`);
        }
      } else {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsPaying(false);
    }
  }, [
    address,
    x402,
    paymentRequirements,
    publicClient,
    paymentChain,
    handleSwitchChain,
  ]);

  if (!x402 || !paymentRequirements) {
    return (
      <div className="container">
        <div className="header">
          <h1 className="title">Payment Required</h1>
          <p className="subtitle">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container gap-8">
      <div className="header">
        <h1 className="title">Payment Required</h1>
        <p>
          {paymentRequirements.description &&
            `${paymentRequirements.description}.`}{" "}
          To access this content, please pay ${amount} {chainName} USDC.
        </p>
        {testnet && (
          <p className="instructions">
            Need Base Sepolia USDC?{" "}
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get some <u>here</u>.
            </a>
          </p>
        )}
      </div>

      <div className="content w-full">
        <Wallet className="w-full">
          <ConnectWallet
            className="w-full py-3"
            disconnectedLabel="Connect wallet"
          >
            <Avatar className="h-5 w-5 opacity-80" />
            <Name className="opacity-80 text-sm" />
          </ConnectWallet>
          <WalletDropdown>
            <WalletDropdownDisconnect className="opacity-80" />
          </WalletDropdown>
        </Wallet>
        {isConnected && (
          <div id="payment-section">
            <div className="payment-details">
              <div className="payment-row">
                <span className="payment-label">Wallet:</span>
                <span className="payment-value">
                  {address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : "Loading..."}
                </span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Available balance:</span>
                <span className="payment-value">
                  <button
                    className="balance-button"
                    onClick={() => setHideBalance((prev) => !prev)}
                  >
                    {formattedUsdcBalance && !hideBalance
                      ? `$${formattedUsdcBalance} USDC`
                      : "••••• USDC"}
                  </button>
                </span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Amount:</span>
                <span className="payment-value">${amount} USDC</span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Network:</span>
                <span className="payment-value">{chainName}</span>
              </div>
            </div>

            {isCorrectChain ? (
              <div className="cta-container">
                {showOnramp && (
                  <FundButton
                    fundingUrl={onrampBuyUrl}
                    text="Get more USDC"
                    hideIcon
                    className="button button-positive"
                  />
                )}
                <button
                  className="button button-primary"
                  onClick={handlePayment}
                  disabled={isPaying}
                >
                  {isPaying ? <Spinner /> : "Pay now"}
                </button>
              </div>
            ) : (
              <button
                className="button button-primary"
                onClick={handleSwitchChain}
              >
                Switch to {chainName}
              </button>
            )}
          </div>
        )}
        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
}
