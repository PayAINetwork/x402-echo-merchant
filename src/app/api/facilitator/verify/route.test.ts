import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock the fetch function
global.fetch = vi.fn();

describe("/api/facilitator/verify", () => {
  const mockFacilitatorUrl = "https://facilitator.example.com";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FACILITATOR_URL = mockFacilitatorUrl;
  });

  it("should forward request to facilitator and return response", async () => {
    const mockPaymentPayload = {
      x402Version: "1.0",
      transaction: "0x123",
      network: "base",
    };

    const mockPaymentRequirements = {
      amount: "1000000",
      token: "0xabc",
    };

    const mockFacilitatorResponse = {
      success: true,
      verified: true,
      message: "Payment verified",
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
      "http://localhost:3000/api/facilitator/verify",
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
      `${mockFacilitatorUrl}/verify`,
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

  it("should handle facilitator errors", async () => {
    const mockPaymentPayload = {
      x402Version: "1.0",
      transaction: "0x123",
      network: "base",
    };

    const mockPaymentRequirements = {
      amount: "1000000",
      token: "0xabc",
    };

    const mockErrorResponse = {
      success: false,
      error: "Verification failed",
    };

    // Mock the fetch response with error status
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      {
        json: async () => mockErrorResponse,
        status: 400,
      }
    );

    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/verify",
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

    expect(response.status).toBe(400);
    expect(data).toEqual(mockErrorResponse);
  });

  it("should handle network errors", async () => {
    const mockPaymentPayload = {
      x402Version: "1.0",
      transaction: "0x123",
      network: "base",
    };

    const mockPaymentRequirements = {
      amount: "1000000",
      token: "0xabc",
    };

    // Mock fetch to throw an error
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/facilitator/verify",
      {
        method: "POST",
        body: JSON.stringify({
          paymentPayload: mockPaymentPayload,
          paymentRequirements: mockPaymentRequirements,
        }),
      }
    );

    await expect(POST(request)).rejects.toThrow("Network error");
  });
});
