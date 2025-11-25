import {
    createWalletClient,
    http,
    erc20Abi,
    getAddress,
    publicActions,
    type WalletClient
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche, avalancheFuji, base, baseSepolia, iotex, sei, seiTestnet, polygon, polygonAmoy, peaq, xLayer } from 'viem/chains';
import { createSigner, PaymentRequirements, SupportedEVMNetworks, SupportedSVMNetworks, Signer, Network } from '@payai/x402/types';
import { xLayerTestnet1952 } from './lib/chains';
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


// load the private key from the .env file
const evmPrivateKey = process.env.EVM_PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(evmPrivateKey);

const svmPrivateKey = process.env.SVM_PRIVATE_KEY as string;

/**
 * Get a signer for the network
 * @param network - The network to get a signer for
 * @returns The signer
 */
const getSigner = async (network: Network) => {
    if (network === "avalanche") {
        return createWalletClient({
          chain: avalanche,
          transport: http(process.env.AVALANCHE_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }
    else if (network === "avalanche-fuji") {
        return createWalletClient({
          chain: avalancheFuji,
          transport: http(process.env.AVALANCHE_FUJI_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "base-sepolia") {
        return createWalletClient({
          chain: baseSepolia,
          transport: http(process.env.BASE_SEPOLIA_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "base") {
        return createWalletClient({
          chain: base,
          transport: http(process.env.BASE_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "sei") {
        return createWalletClient({
          chain: sei,
          transport: http(process.env.SEI_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "sei-testnet") {
        return createWalletClient({
          chain: seiTestnet,
          transport: http(process.env.SEI_TESTNET_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "xlayer") {
        return createWalletClient({
          chain: xLayer,
          transport: http(process.env.XLAYER_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "xlayer-testnet") {
        return createWalletClient({
          chain: xLayerTestnet1952,
          transport: http(process.env.XLAYER_TESTNET_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "iotex") {
        return createWalletClient({
          chain: iotex,
          transport: http(process.env.IOTEX_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "polygon") {
        return createWalletClient({
          chain: polygon,
          transport: http(process.env.POLYGON_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "polygon-amoy") {
        return createWalletClient({
          chain: polygonAmoy,
          transport: http(process.env.POLYGON_AMOY_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "peaq") {
        return createWalletClient({
          chain: peaq,
          transport: http(process.env.PEAQ_RPC_URL as `https://${string}`),
          account,
        }).extend(publicActions);
    }

    else if (network === "solana-devnet") {
      return await createSigner(network, svmPrivateKey);
    }

    else if (network === "solana") {
      return await createSigner(network, svmPrivateKey);
    }

    else {
        throw new Error(`Unsupported network: ${network}`);
    }
}

/**
 * Refund the payment
 * @param selectedPaymentRequirements - The selected payment requirements
 * @returns The tx hash of the refund
 */
export const refund = async (
    recipient: string,
    selectedPaymentRequirements: PaymentRequirements,
) => {
  console.log("refunding payment for network: ", selectedPaymentRequirements.network);
  console.log("payment requirements: ", selectedPaymentRequirements);
  if (SupportedEVMNetworks.includes(selectedPaymentRequirements.network)) {
    // create a signer for the network
    const signer = await getSigner(selectedPaymentRequirements.network) as WalletClient;

    // call the ERC20 transfer function
    const toAddress = getAddress(recipient as `0x${string}`);
    const contractAddress = getAddress(selectedPaymentRequirements.asset as `0x${string}`);
    const result = await signer.writeContract({
        chain: signer.chain,
        address: contractAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [
            toAddress,
            selectedPaymentRequirements.maxAmountRequired as unknown as bigint
        ],
        account: account,
    });

    return result;
  }
  else if (SupportedSVMNetworks.includes(selectedPaymentRequirements.network)) {
    const signer = await getSigner(selectedPaymentRequirements.network) as Signer;
    const kitSigner = signer as unknown as TransactionSigner<string>;
    const isDevnet = selectedPaymentRequirements.network === 'solana-devnet';
    const rpcUrl = isDevnet
      ? (process.env.SOLANA_DEVNET_RPC_URL ?? 'https://api.devnet.solana.com')
      : (process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com');
    const wsUrl = isDevnet
      ? (process.env.SOLANA_DEVNET_WS_URL ?? 'wss://api.devnet.solana.com')
      : (process.env.SOLANA_WS_URL ?? 'wss://api.mainnet-beta.solana.com');

    const rpc = createSolanaRpc(rpcUrl);
    const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

    // Determine mint and associated token accounts
    const mintAddress = selectedPaymentRequirements.asset as string;

    // fetch the mint account
    const mintAccount = await fetchMint(rpc, mintAddress as unknown as SolAddress);
    const programId = mintAccount?.programAddress as SolAddress;
    const decimals = mintAccount.data.decimals;

    // Prefer provided token accounts from the original transaction to avoid ATA creation for PDA owners
    const sourceAta = (await findAssociatedTokenPda({
      mint: mintAddress as unknown as SolAddress,
      owner: kitSigner.address as SolAddress,
      tokenProgram: programId,
    }))[0] as unknown as SolAddress;

    const destinationAta = (await findAssociatedTokenPda({
      mint: mintAddress as unknown as SolAddress,
      owner: recipient as unknown as SolAddress,
      tokenProgram: programId,
    }))[0] as unknown as SolAddress;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ixs: any[] = [];
    const transferIx = getTransferCheckedInstruction(
      {
        source: sourceAta as SolAddress,
        mint: mintAddress as unknown as SolAddress,
        destination: destinationAta as SolAddress,
        authority: kitSigner,
        amount: selectedPaymentRequirements.maxAmountRequired as unknown as bigint,
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
        setTransactionMessageFeePayerSigner(
          kitSigner,
          createTransactionMessage({ version: 0 })
        )
      )
    );
    const signedTransaction = await signTransactionMessageWithSigners(txMessage);

    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
      commitment: 'confirmed',
    });

    const signature = getSignatureFromTransaction(signedTransaction);
    return signature;
  }
};