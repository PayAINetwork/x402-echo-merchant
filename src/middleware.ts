import { NextRequest, NextResponse } from "next/server";
import { Address, getAddress } from "viem";
import { exact } from "@payai/x402/schemes";
import {
  computeRoutePatterns,
  findMatchingPaymentRequirements,
  findMatchingRoute,
  processPriceToAtomicAmount,
  safeBase64Encode,
  toJsonSafe,
} from "@payai/x402/shared";
import { getLocalPaywallHtml } from "./paywall/getPaywallHtml";
import { getSolanaPaywallHtml } from "./paywall/getSolanaPaywallHtml";
import {
  FacilitatorConfig,
  moneySchema,
  ERC20TokenAmount,
  PaymentPayload,
  PaymentRequirements,
  Price,
  Resource,
  RouteConfig,
  RoutesConfig,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
} from "@payai/x402/types";
import { type VerifyResponse } from "@payai/x402/types";
import { useFacilitator } from "@payai/x402/verify";
import { SolanaAddress } from "@payai/x402-next";
import { Network } from "@payai/x402/types";
import { handlePaidContentRequest } from "./lib/paidContentHandler";

const facilitatorUrl = process.env.FACILITATOR_URL as `${string}://${string}`;
const payToEVM = process.env.EVM_RECEIVE_PAYMENTS_ADDRESS as `0x${string}`;
const payToSVM = process.env.SVM_RECEIVE_PAYMENTS_ADDRESS as SolanaAddress;

/**
 * Get RPC URL for a given network from environment variables
 */
function getRpcUrlForNetwork(network: Network): string | undefined {
  switch (network) {
    case "base":
      return process.env.BASE_RPC_URL;
    case "base-sepolia":
      return process.env.BASE_SEPOLIA_RPC_URL;
    case "avalanche":
      return process.env.AVALANCHE_RPC_URL;
    case "avalanche-fuji":
      return process.env.AVALANCHE_FUJI_RPC_URL;
    case "sei":
      return process.env.SEI_RPC_URL;
    case "sei-testnet":
      return process.env.SEI_TESTNET_RPC_URL;
    case "xlayer":
      return process.env.XLAYER_RPC_URL;
    case "xlayer-testnet":
      return process.env.XLAYER_TESTNET_RPC_URL;
    case "polygon":
      return process.env.POLYGON_RPC_URL;
    case "polygon-amoy":
      return process.env.POLYGON_AMOY_RPC_URL;
    case "peaq":
      return process.env.PEAQ_RPC_URL;
    case "iotex":
      return process.env.IOTEX_RPC_URL;
    // SVM networks don't need RPC URLs for paywall (handled server-side)
    case "solana":
    case "solana-devnet":
      return undefined;
    default:
      return undefined;
  }
}

const solanaDevnetConfig = {
  price: "$0.01" as Price,
  network: "solana-devnet" as Network,
  config: {
    description: "Access to protected content on solana devnet",
  },
} as RouteConfig;

const solanaConfig = {
  price: "$0.01" as Price,
  network: "solana" as Network,
  config: {
    description: "Access to protected content on solana mainnet",
  },
} as RouteConfig;

const baseConfig = {
  price: "$0.01" as Price,
  network: "base" as Network,
  config: {
    description: "Access to protected content on base mainnet",
  },
} as RouteConfig;

const sepoliaConfig = {
  price: "$0.01" as Price,
  network: "base-sepolia" as Network,
  config: {
    description: "Access to protected content on base-sepolia",
  },
} as RouteConfig;

const avalancheConfig = {
  price: "$0.01" as Price,
  network: "avalanche" as Network,
  config: {
    description: "Access to protected content on avalanche mainnet",
  },
} as RouteConfig;

const avalancheFujiConfig = {
  price: "$0.01" as Price,
  network: "avalanche-fuji" as Network,
  config: {
    description: "Access to protected content on avalanche-fuji",
  },
} as RouteConfig;

const seiConfig = {
  price: "$0.01" as Price,
  network: "sei" as Network,
  config: {
    description: "Access to protected content on sei mainnet",
  },
} as RouteConfig;

const seiTestnetConfig = {
  price: "$0.01" as Price,
  network: "sei-testnet" as Network,
  config: {
    description: "Access to protected content on sei-testnet",
  },
} as RouteConfig;

const polygonConfig = {
  price: "$0.01" as Price,
  network: "polygon" as Network,
  config: {
    description: "Access to protected content on polygon mainnet",
  },
} as RouteConfig;

const polygonAmoyConfig = {
  price: "$0.01" as Price,
  network: "polygon-amoy" as Network,
  config: {
    description: "Access to protected content on polygon amoy testnet",
  },
} as RouteConfig;

const peaqConfig = {
  price: "$0.01" as Price,
  network: "peaq" as Network,
  config: {
    description: "Access to protected content on peaq mainnet",
  },
} as RouteConfig;

const xlayerConfig = {
  price: "$0.01" as Price,
  network: "xlayer" as Network,
  config: {
    description: "Access to protected content on xlayer mainnet",
  },
} as RouteConfig;

const xlayerTestnetConfig = {
  price: "$0.01" as Price,
  network: "xlayer-testnet" as Network,
  config: {
    description: "Access to protected content on xlayer testnet",
  },
} as RouteConfig;

// middleware uses a payment config that is conditional
// based on which chain the client wants to transact on
// CORS configuration via environment variable
// Set CORS_ALLOWED_ORIGINS as a comma-separated list, e.g.:
// CORS_ALLOWED_ORIGINS="https://example.com,https://app.example.com"
const allowedCorsOrigins: string[] = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function buildCorsHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && allowedCorsOrigins.includes(requestOrigin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
    headers.set("Vary", "Origin");
  }

  // Allow credentials only when we reflect a specific origin
  if (headers.has("Access-Control-Allow-Origin")) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Reflect requested headers for preflight
  const requestHeaders = request.headers.get("access-control-request-headers");
  if (requestHeaders) {
    headers.set("Access-Control-Allow-Headers", requestHeaders);
  } else {
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-PAYMENT, X-PAYMENT-RESPONSE"
    );
  }

  headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  headers.set("Access-Control-Max-Age", "600");
  // Expose custom headers used by the app to the browser
  headers.set("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE");

  return headers;
}

function withCors(request: NextRequest, response: NextResponse) {
  const corsHeaders = buildCorsHeaders(request);
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Extract amount from request body, falling back to default if not provided
 * @param request - The incoming request
 * @param defaultAmount - Default amount to use (e.g., '$0.01')
 * @returns The amount to use for payment
 */
async function getRequestedAmount(
  request: NextRequest,
  defaultAmount: Price
): Promise<string> {
  // Check if request has a body first
  const contentLength = request.headers.get("content-length");
  const contentType = request.headers.get("content-type");

  // No body or not JSON content type - use default
  if (
    !contentLength ||
    contentLength === "0" ||
    !contentType?.includes("application/json")
  ) {
    return convertPriceToString(defaultAmount);
  }

  try {
    // Clone the request to read the body without consuming it
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();

    // Check if amount exists and is a valid positive number
    if (body.amount && typeof body.amount === "number" && body.amount > 0) {
      return `$${body.amount.toFixed(2)}`;
    }

    // Body exists but no valid amount - use default
    return convertPriceToString(defaultAmount);
  } catch (error) {
    // Only catch JSON parsing errors, let other errors bubble up
    if (error instanceof SyntaxError) {
      return convertPriceToString(defaultAmount);
    }
    throw error;
  }
}

/**
 * Convert Price to string format
 * @param price - The price to convert
 * @returns The price as a string
 */
function convertPriceToString(price: Price): string {
  if (typeof price === "string") {
    return price;
  }
  if (typeof price === "number") {
    return `$${price.toFixed(2)}`;
  }
  // For complex token amounts, we'll use a fallback
  return "$0.01";
}

export async function middleware(request: NextRequest) {
  // Handle CORS preflight
  if (request.method.toUpperCase() === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    return withCors(request, preflight);
  }
  const pathname = request.nextUrl.pathname;

  // solana devnet
  if (pathname.startsWith("/api/solana-devnet/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      solanaDevnetConfig.price
    );
    const dynamicConfig = { ...solanaDevnetConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToSVM,
      { "/api/solana-devnet/paid-content": dynamicConfig },
      { url: facilitatorUrl }
    )(request);
    return withCors(request, response);
  }

  // solana mainnet
  if (pathname.startsWith("/api/solana/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      solanaConfig.price
    );
    const dynamicConfig = { ...solanaConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToSVM,
      { "/api/solana/paid-content": dynamicConfig },
      { url: facilitatorUrl }
    )(request);
    return withCors(request, response);
  }

  // base mainnet
  if (pathname.startsWith("/api/base/")) {
    const requestedAmount = await getRequestedAmount(request, baseConfig.price);
    const dynamicConfig = { ...baseConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      // payTo
      payToEVM,
      // routes
      {
        "/api/base/paid-content": dynamicConfig,
      },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // base-sepolia
  if (pathname.startsWith("/api/base-sepolia/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      sepoliaConfig.price
    );
    const dynamicConfig = { ...sepoliaConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      // payTo
      payToEVM,
      // routes
      { "/api/base-sepolia/paid-content": dynamicConfig },
      // facilitator
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // avalanche mainnet
  if (pathname.startsWith("/api/avalanche/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      avalancheConfig.price
    );
    const dynamicConfig = { ...avalancheConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/avalanche/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // avalanche-fuji (testnet)
  if (pathname.startsWith("/api/avalanche-fuji/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      avalancheFujiConfig.price
    );
    const dynamicConfig = { ...avalancheFujiConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/avalanche-fuji/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // polygon mainnet
  if (pathname.startsWith("/api/polygon/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      polygonConfig.price
    );
    const dynamicConfig = { ...polygonConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/polygon/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // polygon-amoy (testnet)
  if (pathname.startsWith("/api/polygon-amoy/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      polygonAmoyConfig.price
    );
    const dynamicConfig = { ...polygonAmoyConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/polygon-amoy/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // xlayer mainnet
  if (pathname.startsWith("/api/xlayer/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      xlayerConfig.price
    );
    const dynamicConfig = { ...xlayerConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/xlayer/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // xlayer-testnet
  if (pathname.startsWith("/api/xlayer-testnet/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      xlayerTestnetConfig.price
    );
    const dynamicConfig = { ...xlayerTestnetConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/xlayer-testnet/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // peaq mainnet
  if (pathname.startsWith("/api/peaq/")) {
    const requestedAmount = await getRequestedAmount(request, peaqConfig.price);
    const dynamicConfig = { ...peaqConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/peaq/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // sei mainnet
  if (pathname.startsWith("/api/sei/")) {
    const requestedAmount = await getRequestedAmount(request, seiConfig.price);
    const dynamicConfig = { ...seiConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/sei/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // sei-testnet
  if (pathname.startsWith("/api/sei-testnet/")) {
    const requestedAmount = await getRequestedAmount(
      request,
      seiTestnetConfig.price
    );
    const dynamicConfig = { ...seiTestnetConfig, price: requestedAmount };
    const response = await paymentMiddleware(
      payToEVM,
      { "/api/sei-testnet/paid-content": dynamicConfig },
      {
        url: facilitatorUrl,
      }
    )(request);
    return withCors(request, response);
  }

  // if not matched, continue without payment enforcement
  return withCors(request, NextResponse.next());
}

/**
 * Creates a payment middleware factory for Next.js
 *
 * @param payTo - The address to receive payments
 * @param routes - Configuration for protected routes and their payment requirements
 * @param facilitator - Optional configuration for the payment facilitator service
 * @returns A Next.js middleware handler
 *
 * @example
 * ```typescript
 * // Simple configuration - All endpoints are protected by $0.01 of USDC on base-sepolia
 * export const middleware = paymentMiddleware(
 *   '0x123...', // payTo address
 *   {
 *     price: '$0.01', // USDC amount in dollars
 *     network: 'base-sepolia'
 *   },
 *   // Optional facilitator configuration. Defaults to x402.org/facilitator for testnet usage
 * );
 *
 * // Advanced configuration - Endpoint-specific payment requirements & custom facilitator
 * export const middleware = paymentMiddleware(
 *   '0x123...', // payTo: The address to receive payments
 *   {
 *     '/protected/*': {
 *       price: '$0.001', // USDC amount in dollars
 *       network: 'base',
 *       config: {
 *         description: 'Access to protected content'
 *       }
 *     },
 *     '/api/premium/*': {
 *       price: {
 *         amount: '100000',
 *         asset: {
 *           address: '0xabc',
 *           decimals: 18,
 *           eip712: {
 *             name: 'WETH',
 *             version: '1'
 *           }
 *         }
 *       },
 *       network: 'base'
 *     }
 *   },
 *   {
 *     url: 'https://facilitator.example.com',
 *     createAuthHeaders: async () => ({
 *       verify: { "Authorization": "Bearer token" },
 *       settle: { "Authorization": "Bearer token" }
 *     })
 *   }
 * );
 * ```
 */
export function paymentMiddleware(
  payTo: Address | SolanaAddress,
  routes: RoutesConfig,
  facilitator?: FacilitatorConfig
) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { verify, settle, supported } = useFacilitator(facilitator);
  const x402Version = 1;

  // Pre-compile route patterns to regex and extract verbs
  const routePatterns = computeRoutePatterns(routes);

  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const method = request.method.toUpperCase();

    // Find matching route configuration
    const matchingRoute = findMatchingRoute(routePatterns, pathname, method);

    if (!matchingRoute) {
      return NextResponse.next();
    }

    const { price, network, config = {} } = matchingRoute.config;
    const {
      description,
      mimeType,
      maxTimeoutSeconds,
      outputSchema,
      customPaywallHtml,
      resource,
      discoverable,
      inputSchema,
      errorMessages,
    } = config;

    const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
    if ("error" in atomicAmountForAsset) {
      return new NextResponse(atomicAmountForAsset.error, { status: 500 });
    }
    const { maxAmountRequired, asset } = atomicAmountForAsset;

    const resourceUrl =
      resource ||
      (`${request.nextUrl.protocol}//${request.nextUrl.host}${pathname}` as Resource);

    const paymentRequirements: PaymentRequirements[] = [];

    if (SupportedEVMNetworks.includes(network)) {
      paymentRequirements.push({
        scheme: "exact",
        network,
        maxAmountRequired,
        resource: resourceUrl,
        description: description ?? "",
        mimeType: mimeType ?? "application/json",
        payTo: getAddress(payTo),
        maxTimeoutSeconds: maxTimeoutSeconds ?? 300,
        asset: getAddress(asset.address),
        // TODO: Rename outputSchema to requestStructure
        outputSchema: {
          input: {
            type: "http",
            method,
            discoverable: discoverable ?? true,
            ...inputSchema,
          },
          output: outputSchema,
        },
        extra: (asset as ERC20TokenAmount["asset"]).eip712,
      });
    }
    // svm networks
    else if (SupportedSVMNetworks.includes(network)) {
      // network call to get the supported payments from the facilitator
      const paymentKinds = await supported();

      // find the payment kind that matches the network and scheme
      let feePayer: string | undefined;
      for (const kind of paymentKinds.kinds) {
        if (kind.network === network && kind.scheme === "exact") {
          feePayer = kind?.extra?.feePayer;
          break;
        }
      }

      // svm networks require a fee payer
      if (!feePayer) {
        throw new Error(
          `The facilitator did not provide a fee payer for network: ${network}.`
        );
      }

      // build the payment requirements for svm
      paymentRequirements.push({
        scheme: "exact",
        network,
        maxAmountRequired,
        resource: resourceUrl,
        description: description ?? "",
        mimeType: mimeType ?? "",
        payTo: payTo,
        maxTimeoutSeconds: maxTimeoutSeconds ?? 60,
        asset: asset.address,
        // TODO: Rename outputSchema to requestStructure
        outputSchema: {
          input: {
            type: "http",
            method,
            ...inputSchema,
          },
          output: outputSchema,
        },
        extra: {
          feePayer,
        },
      });
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }

    // Check for payment header
    const paymentHeader = request.headers.get("X-PAYMENT");
    console.log("🔍 Payment header present:", !!paymentHeader);
    if (!paymentHeader) {
      const accept = request.headers.get("Accept");
      if (accept?.includes("text/html")) {
        const userAgent = request.headers.get("User-Agent");
        if (userAgent?.includes("Mozilla")) {
          let displayAmount: number;
          if (typeof price === "string" || typeof price === "number") {
            const parsed = moneySchema.safeParse(price);
            if (parsed.success) {
              displayAmount = parsed.data;
            } else {
              displayAmount = Number.NaN;
            }
          } else {
            displayAmount = Number(price.amount) / 10 ** price.asset.decimals;
          }

          // Use Solana-specific paywall for Solana networks
          const html =
            customPaywallHtml ??
            (network === "solana" || network === "solana-devnet"
              ? getSolanaPaywallHtml({
                  amount: displayAmount,
                  paymentRequirements: toJsonSafe(
                    paymentRequirements
                  ) as unknown[],
                  currentUrl: request.url,
                  network: network as "solana" | "solana-devnet",
                  description: description,
                  treasuryAddress: payTo as string,
                  facilitatorUrl: facilitatorUrl,
                  apiEndpoint: request.url,
                  rpcUrl:
                    network === "solana-devnet"
                      ? process.env.SOLANA_DEVNET_RPC_URL ??
                        "https://api.devnet.solana.com"
                      : process.env.SOLANA_RPC_URL ??
                        "https://api.mainnet-beta.solana.com",
                })
              : getLocalPaywallHtml({
                  amount: displayAmount,
                  paymentRequirements: toJsonSafe(
                    paymentRequirements
                  ) as Parameters<
                    typeof getLocalPaywallHtml
                  >[0]["paymentRequirements"],
                  currentUrl: request.url,
                  testnet:
                    network === "base-sepolia" ||
                    network === "avalanche-fuji" ||
                    network === "sei-testnet" ||
                    network === "polygon-amoy" ||
                    network === "xlayer-testnet" as unknown as Network,
                  rpcUrl: getRpcUrlForNetwork(network),
                }));
          return new NextResponse(html, {
            status: 402,
            headers: {
              "Content-Type": "text/html",
              "Cross-Origin-Opener-Policy": "unsafe-none",
            },
          });
        }
      }

      return new NextResponse(
        JSON.stringify({
          x402Version,
          error: "X-PAYMENT header is required",
          accepts: paymentRequirements,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify payment
    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = exact.evm.decodePayment(paymentHeader);
      decodedPayment.x402Version = x402Version;
    } catch (error) {
      return new NextResponse(
        JSON.stringify({
          x402Version,
          error: error instanceof Error ? error : "Invalid payment",
          accepts: paymentRequirements,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    const selectedPaymentRequirements = findMatchingPaymentRequirements(
      paymentRequirements,
      decodedPayment
    );
    if (!selectedPaymentRequirements) {
      return new NextResponse(
        JSON.stringify({
          x402Version,
          error: "Unable to find matching payment requirements",
          accepts: toJsonSafe(paymentRequirements),
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify payment via API route
    const verification: VerifyResponse = await verify(
      decodedPayment,
      selectedPaymentRequirements
    );

    // Log verification response for debugging
    if (SupportedSVMNetworks.includes(network)) {
      console.log(
        "Verification response:",
        JSON.stringify(verification, null, 2)
      );
    }

    if (!verification.isValid) {
      return new NextResponse(
        JSON.stringify({
          x402Version,
          error:
            errorMessages?.verificationFailed || verification.invalidReason,
          accepts: paymentRequirements,
          payer: verification.payer,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    // Proceed with request
    const response = NextResponse.next();

    // if the response from the protected route is >= 400, do not settle the payment
    if (response.status >= 400) {
      return response;
    }

    // Settle payment after response via API route
    try {
      const settlement = await settle(
        decodedPayment,
        selectedPaymentRequirements
      );

      console.log(
        "💰 Settlement response:",
        JSON.stringify(settlement, null, 2)
      );

      if (settlement.success) {
        const payer = settlement.payer || verification.payer || "";
        console.log("💳 Payer from settlement:", settlement.payer);
        console.log("💳 Payer from verification:", verification.payer);
        console.log("💳 Final payer used:", payer);

        const responseHeaderData = {
          success: true,
          // keep legacy field for server-side rendering
          transaction: settlement.transaction,
          // add fields expected by @payai/x402-solana-react so it doesn't fallback to tx_<timestamp>
          transactionId: settlement.transaction,
          signature: settlement.transaction,
          network: settlement.network,
          payer,
        };
        const paymentResponseHeader = safeBase64Encode(
          JSON.stringify(responseHeaderData)
        );
        response.headers.set("X-PAYMENT-RESPONSE", paymentResponseHeader);

        if (!payer || payer === "") {
          return response;
        }

        // refund the payment via Node API route for EVM only in this branch
        const apiUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/facilitator/refund`;
        console.log("calling refund API at: ", apiUrl);
        console.log("payment requirements: ", selectedPaymentRequirements);
        console.log("payer: ", payer);
        const refundResp = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: payer,
            selectedPaymentRequirements,
          }),
        });
        if (refundResp.ok) {
          const { refundTxHash } = await refundResp.json();
          console.log("refund response: ", refundTxHash);
          // Build a request for the paidContentHandler with the payment info header
          const forwardHeaders = new Headers();
          // preserve content negotiation and user agent
          const acceptHeader = request.headers.get("accept");
          const userAgentHeader = request.headers.get("user-agent");
          if (acceptHeader) forwardHeaders.set("accept", acceptHeader);
          if (userAgentHeader)
            forwardHeaders.set("user-agent", userAgentHeader);
          forwardHeaders.set("x-payment-response", paymentResponseHeader);
          const handlerRequest = new NextRequest(request.url, {
            headers: forwardHeaders,
            method: "GET",
          });
          // Use the configured network for default display
          const handlerResponse = await handlePaidContentRequest(
            handlerRequest,
            network as unknown as string,
            refundTxHash
          );
          // ensure the client still receives the payment response header
          handlerResponse.headers.set(
            "X-PAYMENT-RESPONSE",
            paymentResponseHeader
          );
          return handlerResponse;
        } else {
          // Forward to handler without refundTxHash to indicate failure
          const forwardHeaders = new Headers();
          const acceptHeader = request.headers.get("accept");
          const userAgentHeader = request.headers.get("user-agent");
          if (acceptHeader) forwardHeaders.set("accept", acceptHeader);
          if (userAgentHeader)
            forwardHeaders.set("user-agent", userAgentHeader);
          forwardHeaders.set("x-payment-response", paymentResponseHeader);
          forwardHeaders.set("x-refund-failed", "true");
          const handlerRequest = new NextRequest(request.url, {
            headers: forwardHeaders,
            method: "GET",
          });
          const handlerResponse = await handlePaidContentRequest(
            handlerRequest,
            network as unknown as string
          );
          handlerResponse.headers.set(
            "X-PAYMENT-RESPONSE",
            paymentResponseHeader
          );
          return handlerResponse;
        }
      } else {
        // Settlement was attempted but did not succeed. Surface this as a 402 so
        // the client can handle it explicitly instead of treating it as a successful
        // content response (which would currently be downloaded as a blob).
        return new NextResponse(
          JSON.stringify({
            x402Version,
            error: "Settlement failed",
            // expose the underlying errorReason from the facilitator when available
            errorReason: settlement.errorReason,
            accepts: paymentRequirements,
          }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error("error", error);

      return new NextResponse(
        JSON.stringify({
          x402Version,
          error:
            errorMessages?.settlementFailed ||
            (error instanceof Error ? error : "Settlement failed"),
          accepts: paymentRequirements,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    return response;
  };
}

export const config = {
  matcher: [
    // Run on all API routes to ensure consistent CORS handling
    "/api/:path*",
  ],
};
