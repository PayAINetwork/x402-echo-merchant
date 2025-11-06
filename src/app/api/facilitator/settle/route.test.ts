import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock the fetch function
global.fetch = vi.fn();

describe("/api/facilitator/settle", () => {
  const mockFacilitatorUrl = "https://facilitator.example.com";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FACILITATOR_URL = mockFacilitatorUrl;
  });

  it("should forward settle request to facilitator and return response", async () => {
    const mockPaymentPayload = {
      x402Version: "1.0",
      transaction: "0x123",
      network: "polygon",
    };

    const mockPaymentRequirements = {
      amount: "2000000",
      token: "0xdef",
    };

    const mockFacilitatorResponse = {
      success: true,
      settled: true,
      settlementTx: "0x456",
    };

    // Mock the fetch response
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      {
        json: async () => mockFacilitatorResponse,
        status: 200,
      }
    );

    // Create a mock request
    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/settle",
      {
        method: "POST",
        body: JSON.stringify({
          paymentPayload: mockPaymentPayload,
          paymentRequirements: mockPaymentRequirements,
        }),
      }
    );

    // Call the handler
    const response = await POST(request);
    const data = await response.json();

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockFacilitatorUrl}/settle`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("x402Version"),
      })
    );

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toEqual(mockFacilitatorResponse);
  });

  it("should handle settlement failures", async () => {
    const mockPaymentPayload = {
      x402Version: "1.0",
      transaction: "0x123",
      network: "polygon",
    };

    const mockPaymentRequirements = {
      amount: "2000000",
      token: "0xdef",
    };

    const mockErrorResponse = {
      success: false,
      error: "Settlement failed - insufficient funds",
    };

    // Mock the fetch response with error status
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      {
        json: async () => mockErrorResponse,
        status: 500,
      }
    );

    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/settle",
      {
        method: "POST",
        body: JSON.stringify({
          paymentPayload: mockPaymentPayload,
          paymentRequirements: mockPaymentRequirements,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual(mockErrorResponse);
  });
});
