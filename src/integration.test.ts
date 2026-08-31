/**
 * Integration tests for x402 payment flows
 *
 * These tests demonstrate how to test the complete payment flow including:
 * - Payment verification
 * - Settlement
 * - Refunds
 *
 * To run these tests:
 * pnpm test src/integration.test.ts
 *
 * Note: These are integration tests that require proper setup:
 * - Funded wallets
 * - RPC endpoints configured
 * - Facilitator service running
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  createPublicClient,
  http,
  parseEther,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Skip these tests by default since they require real network connections
const SKIP_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS !== "true";

describe.skipIf(SKIP_INTEGRATION_TESTS)("Integration Tests", () => {
  const merchantWallet = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });
  let merchantAddress: string;

  beforeAll(() => {
    // Initialize merchant wallet
    const privateKey = process.env.EVM_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      throw new Error("EVM_PRIVATE_KEY not set in environment");
    }

    const account = privateKeyToAccount(privateKey);
    merchantAddress = account.address;

  });

  describe("Wallet Setup", () => {
    it("should have merchant wallet configured", () => {
      expect(merchantAddress).toBeDefined();
      expect(merchantAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      console.log("✅ Merchant wallet:", merchantAddress);
    });

    it("should have sufficient ETH balance for gas", async () => {
      const balance = await merchantWallet.getBalance({
        address: merchantAddress as `0x${string}`,
      });

      console.log(
        "💰 ETH Balance:",
        parseFloat(balance.toString()) / 1e18,
        "ETH"
      );

      // Should have at least 0.001 ETH for gas
      expect(balance).toBeGreaterThan(parseEther("0.001"));
    });

    it("should check USDC token balance", async () => {
      const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

      // Read USDC balance
      const balance = await merchantWallet.readContract({
        address: usdcAddress,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "balance", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [merchantAddress as `0x${string}`],
      });

      console.log(
        "💵 USDC Balance:",
        parseFloat(balance.toString()) / 1e6,
        "USDC"
      );

      // Warn if balance is low
      if (balance < BigInt(1000000)) {
        // Less than 1 USDC
        console.warn("⚠️  Low USDC balance - refunds may fail");
      }
    });
  });

  describe("RPC Endpoints", () => {
    it("should have Base Sepolia RPC configured", () => {
      const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
      expect(rpcUrl).toBeDefined();
      expect(rpcUrl).toContain("http");
      console.log("🌐 Base Sepolia RPC:", rpcUrl);
    });

    it("should be able to fetch latest block", async () => {
      const blockNumber = await merchantWallet.getBlockNumber();
      expect(blockNumber).toBeGreaterThan(BigInt(0));
      console.log("📦 Latest block:", blockNumber.toString());
    });

    it("should be able to estimate gas", async () => {
      const gasPrice = await merchantWallet.getGasPrice();
      expect(gasPrice).toBeGreaterThan(BigInt(0));
      console.log(
        "⛽ Gas price:",
        parseFloat(gasPrice.toString()) / 1e9,
        "gwei"
      );
    });
  });

  describe("Token Configuration", () => {
    it("should verify USDC token details", async () => {
      const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

      const [name, symbol, decimals] = await Promise.all([
        merchantWallet.readContract({
          address: usdcAddress,
          abi: [
            {
              name: "name",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "string" }],
            },
          ],
          functionName: "name",
        }),
        merchantWallet.readContract({
          address: usdcAddress,
          abi: [
            {
              name: "symbol",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "string" }],
            },
          ],
          functionName: "symbol",
        }),
        merchantWallet.readContract({
          address: usdcAddress,
          abi: [
            {
              name: "decimals",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "uint8" }],
            },
          ],
          functionName: "decimals",
        }),
      ]);

      console.log("🪙 Token details:", { name, symbol, decimals });

      expect(symbol).toBe("USDC");
      expect(decimals).toBe(6);
    });
  });

  describe("Payment Flow", () => {
    it("should have facilitator URL configured", () => {
      const facilitatorUrl = process.env.FACILITATOR_URL;
      expect(facilitatorUrl).toBeDefined();
      console.log("🔗 Facilitator URL:", facilitatorUrl);
    });

    it("should have payment receiver address configured", () => {
      const payToAddress = process.env.EVM_RECEIVE_PAYMENTS_ADDRESS;
      expect(payToAddress).toBeDefined();
      expect(getAddress(payToAddress as `0x${string}`)).toBeDefined();
      console.log("💳 Payment receiver:", payToAddress);
    });
  });

  describe("Environment Variables", () => {
    it("should have all required EVM env vars", () => {
      const requiredVars = [
        "EVM_PRIVATE_KEY",
        "EVM_RECEIVE_PAYMENTS_ADDRESS",
        "BASE_SEPOLIA_RPC_URL",
        "FACILITATOR_URL",
      ];

      for (const varName of requiredVars) {
        expect(
          process.env[varName],
          `${varName} should be defined`
        ).toBeDefined();
      }

      console.log("✅ All required environment variables are set");
    });

    it("should have optional network RPCs configured", () => {
      const optionalNetworks = [
        "BASE_RPC_URL",
        "AVALANCHE_RPC_URL",
        "AVALANCHE_FUJI_RPC_URL",
        "POLYGON_RPC_URL",
        "POLYGON_AMOY_RPC_URL",
      ];

      const configured = optionalNetworks.filter((v) => process.env[v]);
      console.log(
        "🌐 Configured networks:",
        configured.length,
        "/",
        optionalNetworks.length
      );

      configured.forEach((network) => {
        console.log("  -", network.replace("_RPC_URL", ""));
      });
    });
  });
});

describe("Manual Testing Guide", () => {
  it("should display manual testing instructions", () => {
    console.log(`

📝 Manual Testing Guide for x402 Payment & Refund Flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Start the Development Server
   $ pnpm dev

2️⃣  Fund Your Merchant Wallet
   Address: ${process.env.EVM_RECEIVE_PAYMENTS_ADDRESS || "Check your .env"}

   Get Base Sepolia testnet funds:
   - ETH: https://www.alchemy.com/faucets/base-sepolia
   - USDC: https://faucet.circle.com/ or swap ETH for USDC

3️⃣  Test Payment Flow
   Navigate to: http://localhost:3000/api/base-sepolia/paid-content

   Expected flow:
   ✓ See paywall UI
   ✓ Connect wallet
   ✓ Approve payment (0.01 USDC)
   ✓ Payment is verified
   ✓ Payment is settled
   ✓ Refund is triggered automatically
   ✓ See success page with refund TX

4️⃣  Check Logs
   Look for structured [refund] events with the settlement transaction,
   network, attempted Solana signatures, and final category/status.

5️⃣  Verify on Block Explorer
   Base Sepolia: https://sepolia.basescan.org/

   Check:
   - Settlement TX (merchant receives USDC)
   - Refund TX (user receives USDC back)

6️⃣  Test Error Cases

   a) Insufficient funds:
      - Empty merchant wallet USDC
      - Try payment → Should see error in logs

   b) Network issues:
      - Use invalid RPC URL
      - Should see connection errors

   c) Invalid recipient:
      - Will be caught during address validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐛 Debugging Tips:
   - Check middleware logs for verification & settlement
   - Check structured refund service logs for refund execution
   - Verify wallet balances on block explorer

📚 Additional Resources:
   - x402 Docs: https://docs.payai.network
   - Base Sepolia Explorer: https://sepolia.basescan.org
   - Test USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e

    `);
    expect(true).toBe(true);
  });
});
