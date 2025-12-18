/**
 * PaymentRequirements type for window.x402
 * Uses CAIP-2 network format (e.g., 'eip155:84532')
 */
export interface PaymentRequirements {
  scheme: string;
  network: string; // CAIP-2 format: 'eip155:84532'
  amount: string; // Atomic amount as string
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    // EIP-712 domain info
    name?: string;
    version?: string;
    // Display fields
    description?: string;
    mimeType?: string;
    resource?: string;
    outputSchema?: {
      input?: {
        type: string;
        method: string;
        discoverable?: boolean;
      };
      output?: unknown;
    };
    // SVM specific
    feePayer?: string;
    [key: string]: unknown;
  };
}

declare global {
  interface Window {
    x402: {
      amount?: number;
      testnet?: boolean;
      paymentRequirements: PaymentRequirements | PaymentRequirements[];
      currentUrl: string;
      cdpClientKey?: string;
      appName?: string;
      appLogo?: string;
      sessionTokenEndpoint?: string;
      rpcUrl?: string;
      config: {
        chainConfig: Record<
          string,
          {
            usdcAddress: string;
            usdcName: string;
          }
        >;
      };
    };
  }
}

export {};
