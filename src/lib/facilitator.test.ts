import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
	getOrGenerateJwt: vi.fn(),
}));

vi.mock("@payai/facilitator", () => ({
	getOrGenerateJwt: auth.getOrGenerateJwt,
}));

import { useFacilitator } from "./facilitator";

describe("PayAI facilitator authentication", () => {
	beforeEach(() => {
		auth.getOrGenerateJwt.mockResolvedValue("service-jwt");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ isValid: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			),
		);
	});

	it("sends a Bearer JWT when Echo Merchant service credentials are configured", async () => {
		const client = useFacilitator({
			url: "https://facilitator.test",
			apiKeyId: "echo-merchant-service",
			apiKeySecret: "payai_sk_secret",
		});

		await client.verify({ x402Version: 2 } as never, {} as never);

		expect(auth.getOrGenerateJwt).toHaveBeenCalledWith({
			apiKeyId: "echo-merchant-service",
			apiKeySecret: "payai_sk_secret",
		});
		expect(fetch).toHaveBeenCalledWith(
			"https://facilitator.test/verify",
			expect.objectContaining({
				headers: {
					Authorization: "Bearer service-jwt",
					"Content-Type": "application/json",
				},
			}),
		);
	});
});
