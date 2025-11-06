import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { handlePaidContentRequest } from "./paidContentHandler";

// Mock renderRizzlerHtml
vi.mock("./utils", () => ({
  renderRizzlerHtml: vi.fn((paymentInfo, refundTxHash) => {
    return `<html><body>Transaction: ${paymentInfo.transaction}, Network: ${
      paymentInfo.network
    }, Payer: ${paymentInfo.payer}, Refund: ${
      refundTxHash || "N/A"
    }</body></html>`;
  }),
}));

describe("handlePaidContentRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 402 when payment header is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/test/paid-content",
      {
        method: "GET",
      }
    );

    const response = await handlePaidContentRequest(request, "base");
    const data = await response.json();

    expect(response.status).toBe(402);
    expect(data).toEqual({
      error: "Payment info missing. Did you pay?",
    });
  });

  it("should return JSON when accept header requests JSON", async () => {
    const mockPaymentInfo = {
      transaction: "0x123abc",
      network: "base",
      payer: "0x456def",
    };

    const encodedPayment = btoa(JSON.stringify(mockPaymentInfo));

    const request = new NextRequest(
      "http://localhost:3000/api/base/paid-content",
      {
        method: "GET",
        headers: {
          "x-payment-response": encodedPayment,
          accept: "application/json",
        },
      }
    );

    const response = await handlePaidContentRequest(request, "base");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transaction).toBe("0x123abc");
    expect(data.network).toBe("base");
    expect(data.payer).toBe("0x456def");
    expect(data.premiumContent).toBe("Have some rizz!");
  });

  it("should return HTML for browser requests", async () => {
    const mockPaymentInfo = {
      transaction: "0x123abc",
      network: "polygon",
      payer: "0x456def",
    };

    const encodedPayment = btoa(JSON.stringify(mockPaymentInfo));

    const request = new NextRequest(
      "http://localhost:3000/api/polygon/paid-content",
      {
        method: "GET",
        headers: {
          "x-payment-response": encodedPayment,
          accept: "text/html",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        },
      }
    );

    const response = await handlePaidContentRequest(request, "polygon");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8"
    );
    expect(html).toContain("0x123abc");
    expect(html).toContain("polygon");
  });

  it("should use default network when not provided in payment info", async () => {
    const mockPaymentInfo = {
      transaction: "0x123abc",
      payer: "0x456def",
    };

    const encodedPayment = btoa(JSON.stringify(mockPaymentInfo));

    const request = new NextRequest(
      "http://localhost:3000/api/avalanche/paid-content",
      {
        method: "GET",
        headers: {
          "x-payment-response": encodedPayment,
          accept: "application/json",
        },
      }
    );

    const response = await handlePaidContentRequest(request, "avalanche");
    const data = await response.json();

    expect(data.network).toBe("avalanche");
  });

  it("should include refund transaction when provided", async () => {
    const mockPaymentInfo = {
      transaction: "0x123abc",
      network: "base",
      payer: "0x456def",
    };

    const encodedPayment = btoa(JSON.stringify(mockPaymentInfo));
    const refundTxHash = "0xrefund789";

    const request = new NextRequest(
      "http://localhost:3000/api/base/paid-content",
      {
        method: "GET",
        headers: {
          "x-payment-response": encodedPayment,
          accept: "application/json",
        },
      }
    );

    const response = await handlePaidContentRequest(
      request,
      "base",
      refundTxHash
    );
    const data = await response.json();

    expect(data.refundTransaction).toBe(refundTxHash);
    expect(data.refundFailed).toBeUndefined();
  });

  it("should set refundFailed when refund hash is undefined", async () => {
    const mockPaymentInfo = {
      transaction: "0x123abc",
      network: "base",
      payer: "0x456def",
    };

    const encodedPayment = btoa(JSON.stringify(mockPaymentInfo));

    const request = new NextRequest(
      "http://localhost:3000/api/base/paid-content",
      {
        method: "GET",
        headers: {
          "x-payment-response": encodedPayment,
          accept: "application/json",
        },
      }
    );

    const response = await handlePaidContentRequest(request, "base", undefined);
    const data = await response.json();

    expect(data.refundFailed).toBe(true);
    expect(data.refundTransaction).toBeUndefined();
  });

  it("should handle invalid payment info JSON", async () => {
    const invalidPayment = "not-valid-base64-or-json";

    const request = new NextRequest(
      "http://localhost:3000/api/base/paid-content",
      {
        method: "GET",
        headers: {
          "x-payment-response": invalidPayment,
          accept: "application/json",
        },
      }
    );

    const response = await handlePaidContentRequest(request, "base");
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Invalid payment info json.",
    });
  });

  it("should detect browser user agents correctly", async () => {
    const mockPaymentInfo = {
      transaction: "0x123abc",
      network: "sei",
      payer: "0x456def",
    };

    const encodedPayment = btoa(JSON.stringify(mockPaymentInfo));

    const browserUserAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) Firefox/89.0",
    ];

    for (const userAgent of browserUserAgents) {
      const request = new NextRequest(
        "http://localhost:3000/api/sei/paid-content",
        {
          method: "GET",
          headers: {
            "x-payment-response": encodedPayment,
            "user-agent": userAgent,
          },
        }
      );

      const response = await handlePaidContentRequest(request, "sei");

      // Should return HTML for browser user agents
      expect(response.headers.get("Content-Type")).toBe(
        "text/html; charset=utf-8"
      );
    }
  });

  it("should return JSON for non-browser clients", async () => {
    const mockPaymentInfo = {
      transaction: "0x123abc",
      network: "peaq",
      payer: "0x456def",
    };

    const encodedPayment = btoa(JSON.stringify(mockPaymentInfo));

    const nonBrowserUserAgents = [
      "curl/7.68.0",
      "Go-http-client/1.1",
      "node-fetch/1.0",
    ];

    for (const userAgent of nonBrowserUserAgents) {
      const request = new NextRequest(
        "http://localhost:3000/api/peaq/paid-content",
        {
          method: "GET",
          headers: {
            "x-payment-response": encodedPayment,
            "user-agent": userAgent,
          },
        }
      );

      const response = await handlePaidContentRequest(request, "peaq");
      const data = await response.json();

      // Should return JSON for non-browser clients
      expect(data.transaction).toBe("0x123abc");
      expect(data.network).toBe("peaq");
    }
  });
});
