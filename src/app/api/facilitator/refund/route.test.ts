import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { Signature } from "@solana/kit";
import * as refundModule from "../../../../refund";
import { Signature, type Address as SolAddress } from "@solana/kit";

// Mock the refund module
vi.mock("../../../../refund", () => ({
  refund: vi.fn(),
}));

describe("/api/facilitator/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process refund successfully", async () => {
    const mockRefundTxHash = "0xrefund123abc";
    const mockRecipient = "0x1234567890123456789012345678901234567890";
    const mockPaymentRequirements = {
      amount: "1000000",
      token: "0xabc",
      network: "base",
    };

    // Mock the refund function
    vi.mocked(refundModule.refund).mockResolvedValueOnce(mockRefundTxHash);

    // Create a mock request
    const headers = new Headers({
      "Content-Type": "application/json",
      "x-payment-response": "mockPaymentResponseHeader",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/refund",
      {
        method: "POST",
        body: JSON.stringify({
          recipient: mockRecipient,
          selectedPaymentRequirements: mockPaymentRequirements,
        }),
        headers,
      }
    );

    // Call the handler
    const response = await POST(request);
    const data = await response.json();

    // Verify refund was called with correct parameters
    expect(refundModule.refund).toHaveBeenCalledWith(
      mockRecipient,
      mockPaymentRequirements
    );

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toEqual({ refundTxHash: mockRefundTxHash });
  });

  it("should handle refund on svm", async () => {
    const mockRefundTxHash = "5KJp8ZQmockSignature123" as Signature;
    const mockRecipient = "7xKPmockSolanaAddress123" as SolAddress;
    const mockPaymentRequirements = {
      amount: "5000000",
      token: "SoLToken123",
      network: "solana",
    };

    // Mock the refund function
    vi.mocked(refundModule.refund).mockResolvedValueOnce(
      mockRefundTxHash as Signature
    );

    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/refund",
      {
        method: "POST",
        body: JSON.stringify({
          recipient: mockRecipient,
          selectedPaymentRequirements: mockPaymentRequirements,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(refundModule.refund).toHaveBeenCalledWith(
      mockRecipient,
      mockPaymentRequirements,
    );

    expect(response.status).toBe(200);
    expect(data).toEqual({ refundTxHash: mockRefundTxHash });
  });

  it("should return 400 when recipient is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/refund",
      {
        method: "POST",
        body: JSON.stringify({
          selectedPaymentRequirements: {
            amount: "1000000",
            token: "0xabc",
          },
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Missing recipient or payment requirements",
    });
    expect(refundModule.refund).not.toHaveBeenCalled();
  });

  it("should return 400 when payment requirements are missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/refund",
      {
        method: "POST",
        body: JSON.stringify({
          recipient: "0x1234567890123456789012345678901234567890",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Missing recipient or payment requirements",
    });
    expect(refundModule.refund).not.toHaveBeenCalled();
  });

  it("should return 500 when refund fails", async () => {
    const mockRecipient = "0x1234567890123456789012345678901234567890";
    const mockPaymentRequirements = {
      amount: "1000000",
      token: "0xabc",
    };

    // Mock the refund function to throw an error
    vi.mocked(refundModule.refund).mockRejectedValueOnce(
      new Error("Insufficient balance for refund")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/refund",
      {
        method: "POST",
        body: JSON.stringify({
          recipient: mockRecipient,
          selectedPaymentRequirements: mockPaymentRequirements,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Refund failed" });
  });
});
