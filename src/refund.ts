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
  sei,
  seiTestnet,
  polygon,
  polygonAmoy,
  xLayer,
  arbitrum,
  arbitrumSepolia,
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
export function getFriendlyNetworkName(network: string): string {
  // If already friendly format (no colon), return as-is
  if (!network.includes(':')) {
    return network;
  }
  // Otherwise, convert from CAIP-2 to friendly name
  return CAIP2_TO_NETWORK[network] || network;
}

export type RefundExecutionFailureCategory =
  | 'evm_submission'
  | 'solana_prepare'
  | 'solana_rpc_unavailable'
  | 'solana_transaction_failed'
  | 'solana_confirmation_timeout'
  | 'solana_blockhash_expired'
  | 'unsupported_network';

export class RefundExecutionError extends Error {
  readonly category: RefundExecutionFailureCategory;
  readonly attemptedSignatures: string[];

  constructor(
    category: RefundExecutionFailureCategory,
    message: string,
    attemptedSignatures: string[] = [],
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'RefundExecutionError';
    this.category = category;
    this.attemptedSignatures = attemptedSignatures;
  }
}

export interface SignedSolanaRefundAttempt {
  signature: string;
  encodedTransaction: string;
  blockhash: string;
  lastValidBlockHeight: string;
}

export interface RefundOptions {
  onEvmSubmitting?: () => Promise<void>;
  onSolanaSigned?: (attempt: SignedSolanaRefundAttempt) => Promise<void>;
  solana?: Partial<{
    maxBlockhashAttempts: number;
    maxPollsPerBlockhash: number;
    rebroadcastEveryPolls: number;
    maxRpcFailures: number;
    pollIntervalMs: number;
  }>;
}

const DEFAULT_SOLANA_OPTIONS = {
  maxBlockhashAttempts: 2,
  maxPollsPerBlockhash: 120,
  rebroadcastEveryPolls: 4,
  maxRpcFailures: 12,
  pollIntervalMs: 500,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
import {
  xLayerTestnet1952,
  skaleBase,
  skaleBaseSepolia,
} from './lib/chains';
import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address as SolAddress,
  type Base64EncodedWireTransaction,
  type Signature,
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
  } else if (network === 'arbitrum') {
    return createWalletClient({
      chain: arbitrum,
      transport: http(process.env.ARBITRUM_RPC_URL as `https://${string}`),
      account,
    }).extend(publicActions);
  } else if (network === 'arbitrum-sepolia') {
    return createWalletClient({
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL as `https://${string}`),
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
  selectedPaymentRequirements: PaymentRequirements,
  options: RefundOptions = {}
) => {
  // Convert CAIP-2 network to friendly name for signer lookup
  const networkForSigner = getFriendlyNetworkName(selectedPaymentRequirements.network);

  if ((SupportedEVMNetworks as readonly string[]).includes(networkForSigner)) {
    try {
      const signer = (await getSigner(networkForSigner)) as WalletClient;

      // Persist the idempotency state before viem can sign or submit anything.
      await options.onEvmSubmitting?.();

      const toAddress = getAddress(recipient as `0x${string}`);
      const contractAddress = getAddress(selectedPaymentRequirements.asset as `0x${string}`);
      return await signer.writeContract({
        chain: signer.chain,
        address: contractAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [toAddress, selectedPaymentRequirements.amount as unknown as bigint],
        account: getEvmAccount(),
      });
    } catch (error) {
      if (error instanceof RefundExecutionError) throw error;
      throw new RefundExecutionError('evm_submission', errorMessage(error), [], {
        cause: error,
      });
    }
  } else if ((SupportedSVMNetworks as readonly string[]).includes(networkForSigner)) {
    const attemptedSignatures: string[] = [];
    const settings = { ...DEFAULT_SOLANA_OPTIONS, ...options.solana };
    const isDevnet = networkForSigner === 'solana-devnet';
    const rpcUrl = isDevnet
      ? (process.env.SOLANA_DEVNET_RPC_URL ?? 'https://api.devnet.solana.com')
      : (process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com');
    const rpc = createSolanaRpc(rpcUrl);

    let kitSigner: TransactionSigner<string>;
    let transferIx: ReturnType<typeof getTransferCheckedInstruction>;
    try {
      const signer = (await getSigner(networkForSigner)) as Signer;
      kitSigner = signer as unknown as TransactionSigner<string>;
      const mintAddress = selectedPaymentRequirements.asset as SolAddress;
      const mintAccount = await fetchMint(rpc, mintAddress);
      const programId = mintAccount.programAddress as SolAddress;

      const sourceAta = (
        await findAssociatedTokenPda({
          mint: mintAddress,
          owner: kitSigner.address as SolAddress,
          tokenProgram: programId,
        })
      )[0];
      const destinationAta = (
        await findAssociatedTokenPda({
          mint: mintAddress,
          owner: recipient as SolAddress,
          tokenProgram: programId,
        })
      )[0];

      transferIx = getTransferCheckedInstruction(
        {
          source: sourceAta,
          mint: mintAddress,
          destination: destinationAta,
          authority: kitSigner,
          amount: selectedPaymentRequirements.amount as unknown as bigint,
          decimals: mintAccount.data.decimals,
        },
        { programAddress: programId }
      );
    } catch (error) {
      throw new RefundExecutionError('solana_prepare', errorMessage(error), [], {
        cause: error,
      });
    }

    for (let blockhashAttempt = 0; blockhashAttempt < settings.maxBlockhashAttempts; blockhashAttempt += 1) {
      let signedAttempt: SignedSolanaRefundAttempt;
      try {
        const { value: latestBlockhash } = await rpc
          .getLatestBlockhash({ commitment: 'confirmed' })
          .send();
        const txMessage = appendTransactionMessageInstructions(
          [transferIx],
          setTransactionMessageLifetimeUsingBlockhash(
            latestBlockhash,
            setTransactionMessageFeePayerSigner(
              kitSigner,
              createTransactionMessage({ version: 0 })
            )
          )
        );
        const signedTransaction = await signTransactionMessageWithSigners(txMessage);
        const signature = getSignatureFromTransaction(signedTransaction);
        const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
        signedAttempt = {
          signature,
          encodedTransaction,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight.toString(),
        };
      } catch (error) {
        throw new RefundExecutionError(
          'solana_prepare',
          errorMessage(error),
          attemptedSignatures,
          { cause: error }
        );
      }

      attemptedSignatures.push(signedAttempt.signature);

      // This hook must complete before the first submission. Production uses it
      // to durably record both the signature and exact signed wire transaction.
      await options.onSolanaSigned?.(signedAttempt);

      const signature = signedAttempt.signature as Signature;
      const encodedTransaction = signedAttempt.encodedTransaction as Base64EncodedWireTransaction;
      const lastValidBlockHeight = BigInt(signedAttempt.lastValidBlockHeight);
      let rpcFailures = 0;
      let sawTransaction = false;
      let expiredWithoutTransaction = false;

      for (let poll = 0; poll < settings.maxPollsPerBlockhash; poll += 1) {
        if (!sawTransaction && poll % settings.rebroadcastEveryPolls === 0) {
          try {
            await rpc
              .sendTransaction(encodedTransaction, {
                encoding: 'base64',
                maxRetries: BigInt(0),
                preflightCommitment: 'confirmed',
              })
              .send();
          } catch {
            // Submission errors can be ambiguous: the RPC may have accepted the
            // transaction before the response was lost. Always check its status.
            rpcFailures += 1;
          }
        }

        let status:
          | Awaited<ReturnType<ReturnType<typeof rpc.getSignatureStatuses>['send']>>['value'][number]
          | undefined;
        try {
          const statusResponse = await rpc
            .getSignatureStatuses([signature], { searchTransactionHistory: true })
            .send();
          status = statusResponse.value[0] ?? undefined;
        } catch {
          rpcFailures += 1;
        }

        if (status) {
          sawTransaction = true;
          if (status.err) {
            throw new RefundExecutionError(
              'solana_transaction_failed',
              'Solana refund transaction failed on-chain',
              attemptedSignatures
            );
          }
          if (
            status.confirmationStatus === 'confirmed' ||
            status.confirmationStatus === 'finalized' ||
            status.confirmations === null
          ) {
            return signedAttempt.signature;
          }
        }

        if (!sawTransaction) {
          try {
            const blockHeight = await rpc.getBlockHeight({ commitment: 'confirmed' }).send();
            if (blockHeight > lastValidBlockHeight) {
              const finalStatusResponse = await rpc
                .getSignatureStatuses([signature], { searchTransactionHistory: true })
                .send();
              const finalStatus = finalStatusResponse.value[0];
              if (finalStatus) {
                sawTransaction = true;
                if (finalStatus.err) {
                  throw new RefundExecutionError(
                    'solana_transaction_failed',
                    'Solana refund transaction failed on-chain',
                    attemptedSignatures
                  );
                }
                if (
                  finalStatus.confirmationStatus === 'confirmed' ||
                  finalStatus.confirmationStatus === 'finalized' ||
                  finalStatus.confirmations === null
                ) {
                  return signedAttempt.signature;
                }
              } else {
                expiredWithoutTransaction = true;
                break;
              }
            }
          } catch (error) {
            if (error instanceof RefundExecutionError) throw error;
            rpcFailures += 1;
          }
        }

        if (rpcFailures > settings.maxRpcFailures) {
          throw new RefundExecutionError(
            'solana_rpc_unavailable',
            'Solana RPC remained unavailable while confirming the refund',
            attemptedSignatures
          );
        }

        await sleep(settings.pollIntervalMs);
      }

      if (expiredWithoutTransaction) {
        continue;
      }

      throw new RefundExecutionError(
        'solana_confirmation_timeout',
        'Solana refund confirmation timed out; the recorded signature will not be replaced',
        attemptedSignatures
      );
    }

    throw new RefundExecutionError(
      'solana_blockhash_expired',
      'Solana refund blockhash attempts expired without an observed transaction',
      attemptedSignatures
    );
  }

  throw new RefundExecutionError(
    'unsupported_network',
    `Unsupported network: ${selectedPaymentRequirements.network}`
  );
};
