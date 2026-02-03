import {
  createWalletClient,
  http,
  erc20Abi,
  getAddress,
  publicActions,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  avalanche,
  avalancheFuji,
  base,
  baseSepolia,
  iotex,
  sei,
  seiTestnet,
  polygon,
  polygonAmoy,
  peaq,
  xLayer,
} from 'viem/chains';
import {
  createSigner,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  CAIP2_TO_NETWORK,
  type PaymentRequirements,
  type Signer,
  type Network,
} from './lib/x402-helpers';

/**
 * Convert CAIP-2 network format to friendly network name
 * Used for signer lookup
 */
function getFriendlyNetworkName(network: string): string {
  // If already friendly format (no colon), return as-is
  if (!network.includes(':')) {
    return network;
  }
  // Otherwise, convert from CAIP-2 to friendly name
  return CAIP2_TO_NETWORK[network] || network;
}
import { xLayerTestnet1952, skaleBase, skaleBaseSepolia } from './lib/chains';
import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address as SolAddress,
  type TransactionSigner,
} from '@solana/kit';
import {
  fetchMint,
  findAssociatedTokenPda,
  getTransferCheckedInstruction,
} from '@solana-program/token-2022';

// Lazy initialization for private keys (avoid build-time errors)
let _evmAccount: ReturnType<typeof privateKeyToAccount> | undefined;
function getEvmAccount() {
  if (!_evmAccount) {
    const evmPrivateKey = process.env.EVM_PRIVATE_KEY as `0x${string}`;
    if (!evmPrivateKey) {
      throw new Error('EVM_PRIVATE_KEY environment variable is not set');
    }
    _evmAccount = privateKeyToAccount(evmPrivateKey);
  }
  return _evmAccount;
}

function getSvmPrivateKey() {
  const svmPrivateKey = process.env.SVM_PRIVATE_KEY as string;
  if (!svmPrivateKey) {
    throw new Error('SVM_PRIVATE_KEY environment variable is not set');
  }
  return svmPrivateKey;
}

/**
 * Get a signer for the network
 * @param network - The network to get a signer for
 * @returns The signer
 */
const getSigner = async (network: Network) => {
  // Handle Solana networks first (don't require EVM keys)
  if (network === 'solana-devnet') {
    return await createSigner(network, getSvmPrivateKey());
  } else if (network === 'solana') {
    return await createSigner(network, getSvmPrivateKey());
  }
  
  // For EVM networks, get the account
  const account = getEvmAccount();
  
  if (network === 'avalanche') {
    return createWalletClient({
      chain: avalanche,
      transport: http(process.env.AVALANCHE_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'avalanche-fuji') {
    return createWalletClient({
      chain: avalancheFuji,
      transport: http(process.env.AVALANCHE_FUJI_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'base-sepolia') {
    return createWalletClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'base') {
    return createWalletClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'sei') {
    return createWalletClient({
      chain: sei,
      transport: http(process.env.SEI_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'sei-testnet') {
    return createWalletClient({
      chain: seiTestnet,
      transport: http(process.env.SEI_TESTNET_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'xlayer') {
    return createWalletClient({
      chain: xLayer,
      transport: http(process.env.XLAYER_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'xlayer-testnet') {
    return createWalletClient({
      chain: xLayerTestnet1952,
      transport: http(process.env.XLAYER_TESTNET_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'iotex') {
    return createWalletClient({
      chain: iotex,
      transport: http(process.env.IOTEX_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'polygon') {
    return createWalletClient({
      chain: polygon,
      transport: http(process.env.POLYGON_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'polygon-amoy') {
    return createWalletClient({
      chain: polygonAmoy,
      transport: http(process.env.POLYGON_AMOY_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'peaq') {
    return createWalletClient({
      chain: peaq,
      transport: http(process.env.PEAQ_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'skale-base') {
    return createWalletClient({
      chain: skaleBase,
      transport: http(process.env.SKALE_BASE_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'skale-base-sepolia') {
    return createWalletClient({
      chain: skaleBaseSepolia,
      transport: http(process.env.SKALE_BASE_SEPOLIA_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else {
    throw new Error(`Unsupported network: ${network}`);
  }
};

/**
 * Refund the payment
 * @param selectedPaymentRequirements - The selected payment requirements
 * @returns The tx hash of the refund
 */
export const refund = async (
  recipient: string,
  selectedPaymentRequirements: PaymentRequirements
) => {
  console.log('refunding payment for network: ', selectedPaymentRequirements.network);
  console.log('payment requirements: ', selectedPaymentRequirements);

  // Convert CAIP-2 network to friendly name for signer lookup
  const networkForSigner = getFriendlyNetworkName(selectedPaymentRequirements.network);

  if ((SupportedEVMNetworks as readonly string[]).includes(networkForSigner)) {
    const signer = (await getSigner(networkForSigner)) as WalletClient;

    // call the ERC20 transfer function
    const toAddress = getAddress(recipient as `0x${string}`);
    const contractAddress = getAddress(selectedPaymentRequirements.asset as `0x${string}`);
    const result = await signer.writeContract({
      chain: signer.chain,
      address: contractAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [toAddress, selectedPaymentRequirements.amount as unknown as bigint],
      account: getEvmAccount(),
    });

    return result;
  } else if ((SupportedSVMNetworks as readonly string[]).includes(networkForSigner)) {
    const signer = (await getSigner(networkForSigner)) as Signer;
    const kitSigner = signer as unknown as TransactionSigner<string>;
    const isDevnet = networkForSigner === 'solana-devnet';
    const rpcUrl = isDevnet
      ? process.env.SOLANA_DEVNET_RPC_URL ?? 'https://api.devnet.solana.com'
      : process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
    const wsUrl = isDevnet
      ? process.env.SOLANA_DEVNET_WS_URL ?? 'wss://api.devnet.solana.com'
      : process.env.SOLANA_WS_URL ?? 'wss://api.mainnet-beta.solana.com';

    const rpc = createSolanaRpc(rpcUrl);
    const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

    // Determine mint and associated token accounts
    const mintAddress = selectedPaymentRequirements.asset as string;

    // fetch the mint account
    const mintAccount = await fetchMint(rpc, mintAddress as unknown as SolAddress);
    const programId = mintAccount?.programAddress as SolAddress;
    const decimals = mintAccount.data.decimals;

    // Prefer provided token accounts from the original transaction to avoid ATA creation for PDA owners
    const sourceAta = (
      await findAssociatedTokenPda({
        mint: mintAddress as unknown as SolAddress,
        owner: kitSigner.address as SolAddress,
        tokenProgram: programId,
      })
    )[0] as unknown as SolAddress;

    const destinationAta = (
      await findAssociatedTokenPda({
        mint: mintAddress as unknown as SolAddress,
        owner: recipient as unknown as SolAddress,
        tokenProgram: programId,
      })
    )[0] as unknown as SolAddress;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ixs: any[] = [];
    const transferIx = getTransferCheckedInstruction(
      {
        source: sourceAta as SolAddress,
        mint: mintAddress as unknown as SolAddress,
        destination: destinationAta as SolAddress,
        authority: kitSigner,
        amount: selectedPaymentRequirements.amount as unknown as bigint,
        decimals: decimals as number,
      },
      {
        programAddress: programId as SolAddress,
      }
    );
    ixs.push(transferIx);

    // Resolve latest blockhash for transaction lifetime
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const txMessage = appendTransactionMessageInstructions(
      ixs,
      setTransactionMessageLifetimeUsingBlockhash(
        latestBlockhash,
        setTransactionMessageFeePayerSigner(kitSigner, createTransactionMessage({ version: 0 }))
      )
    );
    const signedTransaction = await signTransactionMessageWithSigners(txMessage);

    // Cast to any to work around @solana/kit type changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction as any, {
      commitment: 'confirmed',
    });

    const signature = getSignatureFromTransaction(signedTransaction);
    return signature;
  }
};
