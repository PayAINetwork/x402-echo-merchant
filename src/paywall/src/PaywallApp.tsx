'use client';

import { FundButton, getOnrampBuyUrl } from '@coinbase/onchainkit/fund';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  publicActions,
  type Address,
  type PublicClient,
} from 'viem';
import type { Chain } from 'viem';
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
} from 'viem/chains';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';

import { ExactEvmScheme, toClientEvmSigner } from '@payai/x402-evm';
import { safeBase64Encode } from '@payai/x402/utils';
import { xLayerTestnet1952, skaleBase, skaleBaseSepolia } from '../../lib/chains';

// ERC20 ABI for balanceOf function
const ERC20_BALANCE_OF_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

/**
 * Get USDC balance for an address using viem
 *
 * @param client - Any client with readContract capability
 * @param address - The wallet address to check
 * @param usdcAddress - The USDC contract address
 * @returns The balance in base units
 */
async function getUSDCBalance(
  client: { readContract: PublicClient['readContract'] },
  address: Address,
  usdcAddress: Address
): Promise<bigint> {
  try {
    const balance = await client.readContract({
      address: usdcAddress,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
    return balance as bigint;
  } catch (error) {
    console.error('Failed to get USDC balance:', error);
    return BigInt(0);
  }
}

import { Spinner } from './Spinner';
import { useOnrampSessionToken } from './useOnrampSessionToken';
import { ensureValidAmount } from './utils';

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

/**
 * CAIP-2 network to chain mapping
 */
const CAIP2_TO_CHAIN: Record<string, Chain> = {
  'eip155:8453': base,
  'eip155:84532': baseSepolia,
  'eip155:43114': avalanche,
  'eip155:43113': avalancheFuji,
  'eip155:1329': sei,
  'eip155:713715': seiTestnet,
  'eip155:4689': iotex,
  'eip155:137': polygon,
  'eip155:80002': polygonAmoy,
  'eip155:3338': peaq,
  'eip155:196': xLayer,
  'eip155:1952': xLayerTestnet1952,
  'eip155:1187947933': skaleBase,
  'eip155:324705682': skaleBaseSepolia,
};

/**
 * Parse CAIP-2 network format to extract chain ID
 * Format: "eip155:84532"
 */
function parseCAIP2Network(network: string): { namespace: string; chainId: number } {
  const [namespace, chainIdStr] = network.split(':');
  const chainId = parseInt(chainIdStr, 10);
  return { namespace, chainId };
}

/**
 * Get chain name for display from CAIP-2 network
 */
function getChainName(network: string): string {
  const chain = CAIP2_TO_CHAIN[network];
  if (chain) {
    return chain.name;
  }
  // Fallback: try to extract from network string
  const { chainId } = parseCAIP2Network(network);
  return `Chain ${chainId}`;
}

/**
 * Check if network is a testnet based on CAIP-2 format
 */
function isTestnet(network: string): boolean {
  const testnetChainIds = [84532, 43113, 713715, 80002, 195, 324705682]; // base-sepolia, avalanche-fuji, sei-testnet, polygon-amoy, xlayer-testnet, skale-base-sepolia
  const { chainId } = parseCAIP2Network(network);
  return testnetChainIds.includes(chainId);
}

/**
 * Main Paywall App Component
 *
 * @returns The PaywallApp component
 */
export function PaywallApp() {
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync, chains: switchableChains } = useSwitchChain();
  const { data: wagmiWalletClient } = useWalletClient();
  const { sessionToken } = useOnrampSessionToken(address);

  const [status, setStatus] = useState<string>('');
  const [isCorrectChain, setIsCorrectChain] = useState<boolean | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [formattedUsdcBalance, setFormattedUsdcBalance] = useState<string>('');
  const [hideBalance, setHideBalance] = useState(true);

  const isSwitchingRef = useRef<boolean>(false);

  const x402 = window.x402;
  const amount = x402.amount || 0;
  const requirements = Array.isArray(x402.paymentRequirements)
    ? x402.paymentRequirements[0]
    : x402.paymentRequirements;
  const network = requirements?.network;

  // Parse CAIP-2 network to get chain
  const paymentChain = useMemo(() => {
    if (!network) return base;
    return CAIP2_TO_CHAIN[network] || base;
  }, [network]);

  // Determine testnet status from CAIP-2 network
  const testnet = useMemo(() => {
    if (!network) return true;
    return isTestnet(network);
  }, [network]);

  // Get chain name from CAIP-2 network
  const chainName = useMemo(() => {
    if (!network) return 'Base';
    return getChainName(network);
  }, [network]);

  const showOnramp = Boolean(!testnet && isConnected && x402.sessionTokenEndpoint);

  // Memoize publicClient to prevent recreation on every render
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: paymentChain,
        transport: http(x402.rpcUrl || undefined),
      }).extend(publicActions),
    [paymentChain, x402.rpcUrl]
  );

  // Select the first payment requirement that matches the network and scheme
  const paymentRequirements = useMemo(() => {
    if (!x402) return null;
    const requirements = [x402.paymentRequirements].flat();
    // Find the first requirement matching the network and exact scheme
    return (
      requirements.find(r => r.network === network && r.scheme === 'exact') ||
      requirements[0] ||
      null
    );
  }, [x402, network]);

  // Extract chain checking logic so it can be reused
  const checkChain = useCallback(async () => {
    console.log('checkChain', isConnected, paymentChain.id, walletChainId);
    let currentChainId = walletChainId;
    try {
      const ethereum = (window as unknown as { ethereum?: Eip1193Provider })?.ethereum;
      if (ethereum?.request) {
        const hexId = (await ethereum.request({ method: 'eth_chainId' })) as string;
        const parsedId = Number.parseInt(hexId, 16);
        if (Number.isFinite(parsedId)) {
          currentChainId = parsedId;
        }
      }
    } catch {
      // ignore errors reading chain id from provider
    }
    if (isConnected && paymentChain.id === currentChainId) {
      setIsCorrectChain(true);
      setStatus('');
    } else if (isConnected && currentChainId && paymentChain.id !== currentChainId) {
      setIsCorrectChain(false);
      setStatus(`On the wrong network. Please switch to ${chainName}.`);
    } else {
      setIsCorrectChain(null);
      setStatus('');
    }
  }, [isConnected, paymentChain.id, walletChainId, chainName]);

  useEffect(() => {
    void checkChain();
  }, [checkChain]);

  // Memoize balance checking to prevent excessive RPC calls
  const checkUSDCBalance = useCallback(async () => {
    console.log('checkUSDCBalance', address, publicClient);
    if (!address || !paymentRequirements?.asset) {
      return;
    }
    const usdcAddress = paymentRequirements.asset as Address;
    console.log('getUSDCBalance', address, usdcAddress, publicClient);
    const balance = await getUSDCBalance(publicClient, address, usdcAddress);
    console.log('balance', balance);
    const formattedBalance = formatUnits(balance, 6);
    console.log('formattedBalance', formattedBalance);
    setFormattedUsdcBalance(formattedBalance);
  }, [address, publicClient, paymentRequirements?.asset]);

  const onrampBuyUrl = useMemo(() => {
    if (!sessionToken) {
      return;
    }
    return getOnrampBuyUrl({
      presetFiatAmount: 2,
      fiatCurrency: 'USD',
      sessionToken,
    });
  }, [sessionToken]);

  const handleSuccessfulResponse = useCallback(async (response: Response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      document.documentElement.innerHTML = await response.text();
    } else {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.location.href = url;
    }
  }, []);

  const handleSwitchChain = useCallback(async () => {
    if (isCorrectChain || isSwitchingRef.current) {
      return;
    }
    isSwitchingRef.current = true;

    if (!switchableChains?.some(c => c.id === paymentChain.id)) {
      try {
        const ethereum = (window as unknown as { ethereum?: Eip1193Provider })?.ethereum;
        if (!ethereum?.request) {
          setStatus("Your wallet doesn't support adding networks. Please add it manually.");
          return;
        }
        await ethereum.request({
          method: 'wallet_addEthereumChain',
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
        // Manually switch via EIP-3326 to avoid Wagmi 'Chain not configured' errors
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${paymentChain.id.toString(16)}` }],
        });
        setStatus('');
        // Small delay to let wallet settle
        await new Promise(resolve => setTimeout(resolve, 100));
        // Re-check chain status after switch
        await checkChain();
        return;
      } catch (addErr) {
        setStatus(
          addErr instanceof Error
            ? addErr.message
            : 'Failed to add/switch network. Please add it in your wallet and try again.'
        );
        return;
      } finally {
        isSwitchingRef.current = false;
      }
    }

    try {
      setStatus('');
      await switchChainAsync({ chainId: paymentChain.id });
      // Small delay to let wallet settle
      await new Promise(resolve => setTimeout(resolve, 100));
      // Re-check chain status after switch
      await checkChain();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to switch network');
    } finally {
      isSwitchingRef.current = false;
    }
  }, [switchChainAsync, paymentChain, isCorrectChain, switchableChains, chainName, checkChain]);

  // Only check balance when address or connection status changes, not on every render
  useEffect(() => {
    if (address && isConnected && !isSwitchingRef.current) {
      checkUSDCBalance();
    }
  }, [address, isConnected, checkUSDCBalance]);

  const handlePayment = useCallback(async () => {
    if (!address || !x402 || !paymentRequirements) {
      return;
    }

    await handleSwitchChain();

    // Build a wallet client bound to the selected payment chain using the EIP-1193 provider
    const walletClientForSigning = createWalletClient({
      chain: paymentChain,
      transport: custom(
        (window as unknown as { ethereum?: Eip1193Provider })
          ?.ethereum as unknown as Eip1193Provider
      ),
      account: address as `0x${string}`,
    }).extend(publicActions);
    if (!walletClientForSigning) {
      setStatus('Wallet client not available. Please reconnect your wallet.');
      return;
    }

    setIsPaying(true);

    try {
      setStatus('Checking USDC balance...');
      const usdcAddress = paymentRequirements.asset as Address;
      const balance = await getUSDCBalance(publicClient, address, usdcAddress);

      if (balance === BigInt(0)) {
        throw new Error(`Insufficient balance. Make sure you have USDC on ${chainName}`);
      }

      setStatus('Creating payment signature...');
      const validPaymentRequirements = ensureValidAmount(paymentRequirements);

      // Create signer for ExactEvmScheme
      const signer = toClientEvmSigner({
        address: address as Address,
        signTypedData: walletClientForSigning.signTypedData.bind(walletClientForSigning),
      });

      const scheme = new ExactEvmScheme(signer);

      // Cast requirements to expected format (CAIP-2 network with required extra)
      const paymentReqs = {
        ...validPaymentRequirements,
        network: validPaymentRequirements.network as `${string}:${string}`,
        extra: validPaymentRequirements.extra || {},
      };

      // Create payment payload
      const partialPayload = await scheme.createPaymentPayload(2, paymentReqs);

      // Construct full payment payload with accepted requirements
      const fullPaymentPayload = {
        ...partialPayload,
        resource: {
          url: x402.currentUrl,
          description: validPaymentRequirements.extra?.description || '',
          mimeType: validPaymentRequirements.extra?.mimeType || 'application/json',
        },
        accepted: paymentReqs,
      };

      // Encode the payment signature header as base64
      const paymentHeader = safeBase64Encode(JSON.stringify(fullPaymentPayload));

      setStatus('Requesting content with payment...');
      const response = await fetch(x402.currentUrl, {
        headers: {
          'PAYMENT-SIGNATURE': paymentHeader,
          'Access-Control-Expose-Headers': 'PAYMENT-RESPONSE',
        },
      });

      if (response.ok) {
        await handleSuccessfulResponse(response);
      } else if (response.status === 402) {
        // 402 = Payment Required (content not yet paid for)
        // This may indicate a version mismatch - try to parse and retry with correct version
        const errorData = await response.json().catch(() => ({}));

        if (errorData && typeof errorData.x402Version === 'number') {
          // Retry with server's x402Version
          const retryPartialPayload = await scheme.createPaymentPayload(
            errorData.x402Version,
            paymentReqs
          );

          // Construct full payment payload for retry
          const retryFullPayload = {
            ...retryPartialPayload,
            resource: {
              url: x402.currentUrl,
              description: validPaymentRequirements.extra?.description || '',
              mimeType: validPaymentRequirements.extra?.mimeType || 'application/json',
            },
            accepted: paymentReqs,
          };

          const retryHeader = safeBase64Encode(JSON.stringify(retryFullPayload));
          const retryResponse = await fetch(x402.currentUrl, {
            headers: {
              'PAYMENT-SIGNATURE': retryHeader,
              'Access-Control-Expose-Headers': 'PAYMENT-RESPONSE',
            },
          });
          if (retryResponse.ok) {
            await handleSuccessfulResponse(retryResponse);
            return;
          } else {
            throw new Error(`Payment retry failed: ${retryResponse.statusText}`);
          }
        } else {
          throw new Error(`Payment required: ${response.statusText}`);
        }
      } else if (response.status === 500) {
        // 500 = Settlement failed (payment was attempted but failed on server)
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errorReason || errorData.error || 'Settlement failed';
        throw new Error(`Settlement failed: ${errorMessage}`);
      } else {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Payment failed');
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
    chainName,
    handleSuccessfulResponse,
    wagmiWalletClient,
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

  const description = paymentRequirements.extra?.description;

  return (
    <div className="container gap-8">
      <div className="header">
        <h1 className="title">Payment Required</h1>
        <p>
          {description && `${description}.`} To access this content, please pay ${amount}{' '}
          {chainName} USDC.
        </p>
        {testnet && (
          <p className="instructions">
            Need {chainName} USDC?{' '}
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer">
              Get some <u>here</u>.
            </a>
          </p>
        )}
      </div>

      <div className="content w-full">
        <Wallet className="w-full">
          <ConnectWallet className="w-full py-3" disconnectedLabel="Connect wallet">
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
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Loading...'}
                </span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Available balance:</span>
                <span className="payment-value">
                  <button className="balance-button" onClick={() => setHideBalance(prev => !prev)}>
                    {formattedUsdcBalance && !hideBalance
                      ? `$${formattedUsdcBalance} USDC`
                      : '••••• USDC'}
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
                  <FundButton fundingUrl={onrampBuyUrl} className="button button-positive" />
                )}
                <button
                  className="button button-primary"
                  onClick={handlePayment}
                  disabled={isPaying}
                >
                  {isPaying ? <Spinner /> : 'Pay now'}
                </button>
              </div>
            ) : (
              <button className="button button-primary" onClick={handleSwitchChain}>
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
