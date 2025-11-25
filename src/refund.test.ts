import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { PaymentRequirements } from "@payai/x402/types";
import * as viem from "viem";
import { sendAndConfirmTransactionFactory } from "@solana/kit";

// Mock environment variables BEFORE importing modules that use them
beforeAll(() => {
  vi.stubEnv(
    "EVM_PRIVATE_KEY",
    "0x24ee5a2f7f1606e1026ab5443ca5688a88959d810f3fc0f8750b5fccccabeece"
  );
  vi.stubEnv("SVM_PRIVATE_KEY", "mock-solana-private-key-base58");
  vi.stubEnv("BASE_SEPOLIA_RPC_URL", "https://base-sepolia.publicnode.com");
  vi.stubEnv("BASE_RPC_URL", "https://base.publicnode.com");
  vi.stubEnv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com");
  vi.stubEnv("SOLANA_DEVNET_RPC_URL", "https://api.devnet.solana.com");
  vi.stubEnv("SOLANA_WS_URL", "wss://api.mainnet-beta.solana.com");
  vi.stubEnv("SOLANA_DEVNET_WS_URL", "wss://api.devnet.solana.com");
});

// Mock viem functions
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createWalletClient: vi.fn(() => ({
      chain: { id: 84532, name: "Base Sepolia" },
      writeContract: vi.fn().mockResolvedValue("0xrefundTxHash"),
      extend: vi.fn().mockReturnThis(),
    })),
    privateKeyToAccount: vi.fn(() => ({
      address: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
    })),
    getAddress: vi.fn((addr: string) => {
      // Validate Ethereum address format
      if (!addr.startsWith("0x") || addr.length !== 42) {
        throw new Error("Invalid address");
      }
      return addr;
    }),
  };
});

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
  })),
}));

vi.mock("viem/chains", () => ({
  baseSepolia: { id: 84532, name: "Base Sepolia" },
  base: { id: 8453, name: "Base" },
  avalanche: { id: 43114, name: "Avalanche" },
  avalancheFuji: { id: 43113, name: "Avalanche Fuji" },
  polygon: { id: 137, name: "Polygon" },
  polygonAmoy: { id: 80002, name: "Polygon Amoy" },
  sei: { id: 1329, name: "Sei" },
  seiTestnet: { id: 1328, name: "Sei Testnet" },
  iotex: { id: 4689, name: "IoTeX" },
  peaq: { id: 3338, name: "Peaq" },
}));

// Mock Solana functions
vi.mock("@solana/kit", () => ({
  createSolanaRpc: vi.fn(() => ({
    getLatestBlockhash: vi.fn(() => ({
      send: vi.fn(() =>
        Promise.resolve({ value: { blockhash: "mockBlockhash" } })
      ),
    })),
  })),
  createSolanaRpcSubscriptions: vi.fn(() => ({})),
  sendAndConfirmTransactionFactory: vi.fn(() => vi.fn(() => Promise.resolve())),
  getSignatureFromTransaction: vi.fn(() => "mockSignature123"),
  appendTransactionMessageInstructions: vi.fn(() => ({})),
  createTransactionMessage: vi.fn(() => ({})),
  setTransactionMessageFeePayerSigner: vi.fn(() => ({})),
  setTransactionMessageLifetimeUsingBlockhash: vi.fn(() => ({})),
  signTransactionMessageWithSigners: vi.fn(() => ({
    signature: "mockSignature123",
  })),
  type: vi.fn(),
}));

vi.mock("@solana-program/token-2022", () => ({
  findAssociatedTokenPda: vi.fn(() => ["mockAssociatedTokenAccount"]),
  getCreateAssociatedTokenInstructionAsync: vi.fn(() => undefined), // No instruction needed
  getTransferCheckedInstruction: vi.fn(() => ({})), // Mock instruction object
  fetchMint: vi.fn(() =>
    Promise.resolve({
      programAddress: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      data: { decimals: 6 },
    })
  ),
}));

// Mock x402 createSigner
vi.mock("@payai/x402/types", async () => {
  const actual = await vi.importActual("@payai/x402/types");
  return {
    ...actual,
    SupportedSVMNetworks: ["solana", "solana-devnet"],
    createSigner: vi.fn((network: string) => {
      if (network === "solana" || network === "solana-devnet") {
        return Promise.resolve({
          signAndSendTransaction: vi.fn().mockResolvedValue({
            signature: "mockSignature123",
          }),
        });
      }
      // For EVM networks, this shouldn't be called in our tests
      throw new Error(`Unsupported network in mock: ${network}`);
    }),
  };
});

// Remove the separate mock - it's handled in vi.mock above
// vi.mocked(createSigner).mockImplementation...

// Import after mocking
import { refund } from "./refund";

describe("refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("EVM Chains", () => {
    it("should refund on Base Sepolia", async () => {
      const mockWriteContract = vi.fn().mockResolvedValue("0xrefundTxHash123");
      const mockWalletClient = {
        chain: { id: 84532, name: "Base Sepolia" },
        writeContract: mockWriteContract,
        extend: vi.fn().mockReturnThis(),
      };

      vi.mocked(viem.createWalletClient).mockReturnValue(
        mockWalletClient as viem.WalletClient
      );

      const recipient = "0xb38824330c40B846eF8AE4443205123cF57BB239";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: "base-sepolia",
        maxAmountRequired: "10000",
        resource: "http://localhost:3000/api/base-sepolia/paid-content",
        description: "Test payment",
        mimeType: "application/json",
        payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
        maxTimeoutSeconds: 300,
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC
        outputSchema: {},
        extra: { name: "USDC", version: "2" },
      };

      const result = await refund(recipient, paymentRequirements);

      expect(result).toBe("0xrefundTxHash123");
      expect(mockWriteContract).toHaveBeenCalledWith({
        chain: mockWalletClient.chain,
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        abi: expect.any(Array),
        functionName: "transfer",
        args: [recipient, "10000"],
        account: expect.any(Object),
      });
    });

    it("should refund on Base mainnet", async () => {
      const mockWriteContract = vi.fn().mockResolvedValue("0xrefundTxHash456");
      const mockWalletClient = {
        chain: { id: 8453, name: "Base" },
        writeContract: mockWriteContract,
        extend: vi.fn().mockReturnThis(),
      };

      vi.mocked(viem.createWalletClient).mockReturnValue(
        mockWalletClient as viem.WalletClient
      );

      const recipient = "0xb38824330c40B846eF8AE4443205123cF57BB239";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "50000",
        resource: "http://localhost:3000/api/base/paid-content",
        description: "Test payment",
        mimeType: "application/json",
        payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
        maxTimeoutSeconds: 300,
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
        outputSchema: {},
        extra: { name: "USDC", version: "2" },
      };

      const result = await refund(recipient, paymentRequirements);

      expect(result).toBe("0xrefundTxHash456");
      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should handle insufficient funds error gracefully", async () => {
      const mockWriteContract = vi
        .fn()
        .mockRejectedValue(new Error("insufficient funds for transfer"));
      const mockWalletClient = {
        chain: { id: 84532, name: "Base Sepolia" },
        writeContract: mockWriteContract,
        extend: vi.fn().mockReturnThis(),
      };

      vi.mocked(viem.createWalletClient).mockReturnValue(
        mockWalletClient as viem.WalletClient
      );

      const recipient = "0xb38824330c40B846eF8AE4443205123cF57BB239";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: "base-sepolia",
        maxAmountRequired: "10000",
        resource: "http://localhost:3000/api/base-sepolia/paid-content",
        description: "Test payment",
        mimeType: "application/json",
        payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
        maxTimeoutSeconds: 300,
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        outputSchema: {},
        extra: { name: "USDC", version: "2" },
      };

      await expect(refund(recipient, paymentRequirements)).rejects.toThrow(
        "insufficient funds for transfer"
      );
    });

    it("should validate recipient address", async () => {
      const mockWriteContract = vi.fn().mockResolvedValue("0xrefundTxHash789");
      const mockWalletClient = {
        chain: { id: 84532, name: "Base Sepolia" },
        writeContract: mockWriteContract,
        extend: vi.fn().mockReturnThis(),
      };

      vi.mocked(viem.createWalletClient).mockReturnValue(
        mockWalletClient as viem.WalletClient
      );

      const invalidRecipient = "invalid-address";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: "base-sepolia",
        maxAmountRequired: "10000",
        resource: "http://localhost:3000/api/base-sepolia/paid-content",
        description: "Test payment",
        mimeType: "application/json",
        payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
        maxTimeoutSeconds: 300,
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        outputSchema: {},
        extra: { name: "USDC", version: "2" },
      };

      // Should throw error for invalid address
      await expect(
        refund(invalidRecipient, paymentRequirements)
      ).rejects.toThrow();
    });

    it("should work with different EVM networks", async () => {
      const networks = [
        { name: "avalanche", rpcKey: "AVALANCHE_RPC_URL" },
        { name: "polygon", rpcKey: "POLYGON_RPC_URL" },
        { name: "sei", rpcKey: "SEI_RPC_URL" },
      ];

      for (const network of networks) {
        vi.stubEnv(network.rpcKey, `https://${network.name}.example.com`);

        const mockWriteContract = vi.fn().mockResolvedValue("0xrefundTxHash");
        const mockWalletClient = {
          chain: { id: 1, name: network.name },
          writeContract: mockWriteContract,
          extend: vi.fn().mockReturnThis(),
        };

        vi.mocked(viem.createWalletClient).mockReturnValue(
          mockWalletClient as viem.WalletClient
        );

        const paymentRequirements: PaymentRequirements = {
          scheme: "exact",
          network: network.name as "avalanche" | "polygon" | "sei",
          maxAmountRequired: "10000",
          resource: `http://localhost:3000/api/${network.name}/paid-content`,
          description: "Test payment",
          mimeType: "application/json",
          payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
          maxTimeoutSeconds: 300,
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          outputSchema: {},
          extra: { name: "USDC", version: "2" },
        };

        const result = await refund(
          "0xb38824330c40B846eF8AE4443205123cF57BB239",
          paymentRequirements
        );

        expect(result).toBe("0xrefundTxHash");
        expect(mockWriteContract).toHaveBeenCalled();
      }
    });
  });

  describe("SVM Chains", () => {
    it("should refund on Solana mainnet", async () => {
      const recipient = "7xKPmockSolanaAddress123";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: "solana",
        maxAmountRequired: "5000000",
        resource: "http://localhost:3000/api/solana/paid-content",
        description: "Test payment",
        mimeType: "application/json",
        payTo: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
        maxTimeoutSeconds: 300,
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
        outputSchema: {},
        extra: { name: "USDC", version: "2" },
      };

      const svmContext = {
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        sourceTokenAccount: "So11111111111111111111111111111111111111112",
        destinationTokenAccount: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6,
      };

      const result = await refund(recipient, paymentRequirements, svmContext);
      expect(result).toBe("mockSignature123");
    });

    it("should refund on Solana devnet", async () => {
      const recipient = "7xKPmockSolanaAddress123";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: "solana-devnet",
        maxAmountRequired: "1000000",
        resource: "http://localhost:3000/api/solana-devnet/paid-content",
        description: "Test payment",
        mimeType: "application/json",
        payTo: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        maxTimeoutSeconds: 300,
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        outputSchema: {},
        extra: { name: "USDC", version: "2" },
      };

      const svmContext = {
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        sourceTokenAccount: "So11111111111111111111111111111111111111112",
        destinationTokenAccount: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6,
      };

      const result = await refund(recipient, paymentRequirements, svmContext);

      expect(result).toBe("mockSignature123");
    });

    it("should handle SVM network connection errors", async () => {
      // Temporarily override the mock for this test
      const mockSendAndConfirm = vi.fn(() =>
        Promise.reject(new Error("Network request failed"))
      );
      vi.mocked(sendAndConfirmTransactionFactory).mockReturnValueOnce(
        mockSendAndConfirm
      );

      const recipient = "7xKPmockSolanaAddress123";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: "solana",
        maxAmountRequired: "5000000",
        resource: "http://localhost:3000/api/solana/paid-content",
        description: "Test payment",
        mimeType: "application/json",
        payTo: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        maxTimeoutSeconds: 300,
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        outputSchema: {},
        extra: { name: "USDC", version: "2" },
      };

      const svmContext = {
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        sourceTokenAccount: "So11111111111111111111111111111111111111112",
        destinationTokenAccount: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6,
      };

      await expect(
        refund(recipient, paymentRequirements, svmContext)
      ).rejects.toThrow("Network request failed");
    });
    describe("Amount Handling", () => {
      it("should handle different refund amounts correctly", async () => {
        const amounts = [
          { amount: "1000", description: "0.001 USDC" },
          { amount: "10000", description: "0.01 USDC" },
          { amount: "100000", description: "0.1 USDC" },
          { amount: "1000000", description: "1 USDC" },
        ];

        for (const { amount, description } of amounts) {
          const mockWriteContract = vi.fn().mockResolvedValue("0xrefundTxHash");
          const mockWalletClient = {
            chain: { id: 84532, name: "Base Sepolia" },
            writeContract: mockWriteContract,
            extend: vi.fn().mockReturnThis(),
          };

          vi.mocked(viem.createWalletClient).mockReturnValue(
            mockWalletClient as viem.WalletClient
          );

          const paymentRequirements: PaymentRequirements = {
            scheme: "exact",
            network: "base-sepolia",
            maxAmountRequired: amount,
            resource: "http://localhost:3000/api/base-sepolia/paid-content",
            description: `Test payment - ${description}`,
            mimeType: "application/json",
            payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
            maxTimeoutSeconds: 300,
            asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            outputSchema: {},
            extra: { name: "USDC", version: "2" },
          };

          await refund(
            "0xb38824330c40B846eF8AE4443205123cF57BB239",
            paymentRequirements
          );

          expect(mockWriteContract).toHaveBeenCalledWith(
            expect.objectContaining({
              args: [expect.any(String), amount],
            })
          );
        }
      });
    });

    describe("Error Scenarios", () => {
      it("should handle network connection errors", async () => {
        const mockWriteContract = vi
          .fn()
          .mockRejectedValue(new Error("Network request failed"));
        const mockWalletClient = {
          chain: { id: 84532, name: "Base Sepolia" },
          writeContract: mockWriteContract,
          extend: vi.fn().mockReturnThis(),
        };

        vi.mocked(viem.createWalletClient).mockReturnValue(
          mockWalletClient as viem.WalletClient
        );

        const paymentRequirements: PaymentRequirements = {
          scheme: "exact",
          network: "base-sepolia",
          maxAmountRequired: "10000",
          resource: "http://localhost:3000/api/base-sepolia/paid-content",
          description: "Test payment",
          mimeType: "application/json",
          payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
          maxTimeoutSeconds: 300,
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          outputSchema: {},
          extra: { name: "USDC", version: "2" },
        };

        await expect(
          refund(
            "0xb38824330c40B846eF8AE4443205123cF57BB239",
            paymentRequirements
          )
        ).rejects.toThrow("Network request failed");
      });

      it("should handle gas estimation errors", async () => {
        const mockWriteContract = vi
          .fn()
          .mockRejectedValue(new Error("Gas estimation failed"));
        const mockWalletClient = {
          chain: { id: 84532, name: "Base Sepolia" },
          writeContract: mockWriteContract,
          extend: vi.fn().mockReturnThis(),
        };

        vi.mocked(viem.createWalletClient).mockReturnValue(
          mockWalletClient as viem.WalletClient
        );

        const paymentRequirements: PaymentRequirements = {
          scheme: "exact",
          network: "base-sepolia",
          maxAmountRequired: "10000",
          resource: "http://localhost:3000/api/base-sepolia/paid-content",
          description: "Test payment",
          mimeType: "application/json",
          payTo: "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19",
          maxTimeoutSeconds: 300,
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          outputSchema: {},
          extra: { name: "USDC", version: "2" },
        };

        await expect(
          refund(
            "0xb38824330c40B846eF8AE4443205123cF57BB239",
            paymentRequirements
          )
        ).rejects.toThrow("Gas estimation failed");
      });
    });
  });
});
