import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextResponse } from "next/server";
import * as paidContentHandler from "@/lib/paidContentHandler";

// Mock the paidContentHandler module
vi.mock("@/lib/paidContentHandler", () => ({
  handlePaidContentRequest: vi.fn(),
}));

describe("/api/base/paid-content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ok response", async () => {
    const mockResponse = {
      ok: true,
    };

    // Mock the handler
    vi.mocked(
      paidContentHandler.handlePaidContentRequest
    ).mockResolvedValueOnce(NextResponse.json(mockResponse));

    // Call the handler
    const req = new Request("http://localhost/api/base/paid-content", {
      method: "GET",
      headers: new Headers(),
    });
    const response = await GET(req);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);
  });
});
