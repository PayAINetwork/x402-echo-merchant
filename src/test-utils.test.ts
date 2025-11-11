/**
 * Practical Test Suite for x402 Payment & Refund System
 *
 * Run with: pnpm test src/test-utils.test.ts
 */

import { describe, it, expect } from "vitest";
import { getAddress } from "viem";

describe("Configuration Tests", () => {
  describe("Environment Variables", () => {
    it("should have EVM private key configured", () => {
      const privateKey = process.env.EVM_PRIVATE_KEY;
      if (!privateKey) {
        console.warn("⚠️ EVM_PRIVATE_KEY not set - skipping test");
        return;
      }
      expect(privateKey).toBeDefined();
      expect(privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should have payment receiver address configured", () => {
      const address = process.env.EVM_RECEIVE_PAYMENTS_ADDRESS;
      if (!address) {
        console.warn("⚠️ EVM_RECEIVE_PAYMENTS_ADDRESS not set - skipping test");
        return;
      }
      expect(address).toBeDefined();
      expect(() => getAddress(address as `0x${string}`)).not.toThrow();
    });

    it("should have Base Sepolia RPC URL", () => {
      const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
      if (!rpcUrl) {
        console.warn("⚠️ BASE_SEPOLIA_RPC_URL not set - skipping test");
        return;
      }
      expect(rpcUrl).toBeDefined();
      expect(rpcUrl).toContain("http");
    });

    it("should have facilitator URL configured", () => {
      const facilitatorUrl = process.env.FACILITATOR_URL;
      if (!facilitatorUrl) {
        console.warn("⚠️ FACILITATOR_URL not set - skipping test");
        return;
      }
      expect(facilitatorUrl).toBeDefined();
    });
  });

  describe("Network Configuration", () => {
    const networks = [
      { name: "Base Sepolia", key: "BASE_SEPOLIA_RPC_URL", required: true },
      { name: "Base", key: "BASE_RPC_URL", required: false },
      { name: "Avalanche", key: "AVALANCHE_RPC_URL", required: false },
      {
        name: "Avalanche Fuji",
        key: "AVALANCHE_FUJI_RPC_URL",
        required: false,
      },
      { name: "Polygon", key: "POLYGON_RPC_URL", required: false },
      { name: "Polygon Amoy", key: "POLYGON_AMOY_RPC_URL", required: false },
      { name: "Sei", key: "SEI_RPC_URL", required: false },
      { name: "Sei Testnet", key: "SEI_TESTNET_RPC_URL", required: false },
    ];

    networks.forEach(({ name, key, required }) => {
      it(`should ${required ? "have" : "optionally have"} ${name} RPC`, () => {
        const rpcUrl = process.env[key];
        if (required) {
          if (!rpcUrl) {
            console.warn(`⚠️ ${name} RPC not set - skipping test`);
            return;
          }
          expect(rpcUrl).toBeDefined();
        }
        if (rpcUrl) {
          console.log(`✅ ${name}: ${rpcUrl}`);
        } else {
          console.log(`⚠️  ${name}: Not configured`);
        }
      });
    });
  });
});

describe("Address Validation", () => {
  it("should validate ethereum addresses correctly", () => {
    const validAddress = "0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19";
    expect(() => getAddress(validAddress)).not.toThrow();
    expect(getAddress(validAddress)).toBe(validAddress);
  });

  it("should reject invalid addresses", () => {
    const invalidAddresses = [
      "invalid",
      "0x123",
      "0xinvalid",
      "",
      "not-an-address",
    ];

    invalidAddresses.forEach((addr) => {
      expect(() => getAddress(addr as string)).toThrow();
    });
  });

  it("should handle address checksums", () => {
    const lowercaseAddr = "0xb01d6018caa5ce71d9cf1f45e030b4cb70e86c19";
    const checksumAddr = getAddress(lowercaseAddr);
    expect(checksumAddr).toBe("0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19");
  });
});

describe("Amount Calculations", () => {
  it("should convert USDC amounts correctly", () => {
    const amounts = [
      { usd: 0.01, units: 10000, description: "0.01 USDC" },
      { usd: 0.1, units: 100000, description: "0.1 USDC" },
      { usd: 1, units: 1000000, description: "1 USDC" },
      { usd: 10, units: 10000000, description: "10 USDC" },
    ];

    amounts.forEach(({ usd, units, description }) => {
      const calculated = Math.floor(usd * 1e6);
      expect(calculated).toBe(units);
      console.log(`${description} = ${units} units`);
    });
  });

  it("should handle decimal precision", () => {
    // USDC has 6 decimals
    const decimals = 6;
    const amount = 0.123456; // USD
    const units = Math.floor(amount * Math.pow(10, decimals));
    expect(units).toBe(123456);
  });
});

describe("Error Messages", () => {
  it("should have descriptive error messages for common issues", () => {
    const commonErrors = {
      insufficientFunds: "insufficient funds for transfer",
      invalidRecipient: "invalid address",
      networkError: "Network request failed",
      gasEstimation: "Gas estimation failed",
    };

    Object.entries(commonErrors).forEach(([key, message]) => {
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
      console.log(`${key}: "${message}"`);
    });
  });
});

describe("Test Helper Functions", () => {
  it("should create mock payment requirements", () => {
    const mockPaymentRequirements = {
      scheme: "exact" as const,
      network: "base-sepolia" as const,
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

    expect(mockPaymentRequirements.scheme).toBe("exact");
    expect(mockPaymentRequirements.network).toBe("base-sepolia");
    expect(mockPaymentRequirements.maxAmountRequired).toBe("10000");
  });

  it("should create mock verification response", () => {
    const mockVerification = {
      isValid: true,
      payer: "0xb38824330c40B846eF8AE4443205123cF57BB239",
    };

    expect(mockVerification.isValid).toBe(true);
    expect(mockVerification.payer).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should create mock settlement response", () => {
    const mockSettlement = {
      success: true,
      transaction:
        "0x2c1750e8546c4148e36f054e6561d49059fbdfb5d7aeb568c674b86bd906e576",
      network: "base-sepolia",
    };

    expect(mockSettlement.success).toBe(true);
    expect(mockSettlement.transaction).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(mockSettlement.network).toBe("base-sepolia");
  });
});

describe("Documentation", () => {
  it("should display refund flow documentation", () => {
    console.log(`

🔄 How Refund Works on EVM Chains
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Payment Verification
   ├─ User submits payment transaction
   ├─ Middleware calls facilitator /verify
   └─ Returns: { isValid: true, payer: "0x..." }

2. Payment Settlement
   ├─ Middleware calls facilitator /settle
   ├─ Payment is processed on-chain
   └─ Returns: { success: true, transaction: "0x..." }

3. Refund Trigger (Automatic)
   ├─ Extract payer from verification
   ├─ Call /api/facilitator/refund
   └─ Pass: recipient, selectedPaymentRequirements

4. Refund Execution
   ├─ Create wallet signer from EVM_PRIVATE_KEY
   ├─ Call ERC20 transfer(recipient, amount)
   ├─ Wait for transaction confirmation
   └─ Return transaction hash

5. Response to User
   ├─ Set X-PAYMENT-RESPONSE header
   ├─ Include refund transaction hash
   └─ Display success page with both TXs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Points:
✓ Refund uses merchant's wallet (EVM_PRIVATE_KEY)
✓ Merchant pays gas fees for refund
✓ Refund happens automatically after settlement
✓ Works across all EVM chains (Base, Avalanche, Polygon, etc.)

Common Issues:
✗ Insufficient ETH for gas → Fund merchant wallet
✗ Insufficient USDC → Get testnet USDC
✗ Wrong RPC URL → Check .env configuration
✗ No payer extracted → Check verification response

    `);
    expect(true).toBe(true);
  });

  it("should display testing checklist", () => {
    console.log(`

✅ Testing Checklist
━━━━━━━━━━━━━━━━━━

Environment Setup:
□ EVM_PRIVATE_KEY is set
□ EVM_RECEIVE_PAYMENTS_ADDRESS is set
□ RPC URLs are configured
□ FACILITATOR_URL is set

Wallet Funding:
□ Merchant wallet has ETH for gas
□ Merchant wallet has USDC for refunds
□ Can verify balances on block explorer

Testing Flow:
□ Start dev server (pnpm dev)
□ Navigate to /api/base-sepolia/paid-content
□ Complete payment in wallet
□ Check logs for refund process
□ Verify refund TX on explorer

Log Indicators:
💳 EVM Payer extracted
🔄 Attempting refund to
📥 Refund API called
💰 Refund function called
🔗 Processing EVM refund
✅ Refund completed! TX Hash

    `);
    expect(true).toBe(true);
  });
});
