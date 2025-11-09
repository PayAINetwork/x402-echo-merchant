import { createRoot } from "react-dom/client";
import { X402Paywall, SolanaNetwork } from "@payai/x402-solana-react";
import "@payai/x402-solana-react/styles";
import "@solana/wallet-adapter-react-ui/styles.css";

interface X402Config {
  amount: number;
  description: string;
  network: SolanaNetwork;
  treasuryAddress: string;
  facilitatorUrl: string;
  apiEndpoint: string;
  rpcUrl?: string;
}

// Store the payment response content globally so we can access it in onPaymentSuccess
let paymentResponseContent: string | null = null;

// Intercept console.log to capture the payment content logged by X402Paywall library
const originalConsoleLog = console.log;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.log = function (...args: any[]) {
  // Check if this is the "Payment successful" log with content
  if (
    args[0] === "Payment successful:" &&
    args[1] &&
    typeof args[1] === "object" &&
    args[1].content
  ) {
    console.warn("🎯 Captured payment content from library logs!");
    paymentResponseContent = args[1].content;
  }
  // Call original console.log
  originalConsoleLog.apply(console, args);
};

function PaywallApp({ x402Config }: { x402Config: X402Config }) {
  return (
    <X402Paywall
      amount={x402Config.amount}
      description={x402Config.description}
      network={x402Config.network}
      treasuryAddress={x402Config.treasuryAddress}
      facilitatorUrl={x402Config.facilitatorUrl}
      apiEndpoint={x402Config.apiEndpoint}
      rpcUrl={x402Config.rpcUrl}
      onPaymentSuccess={async (
        paymentResult:
          | string
          | { transactionId?: string; signature?: string; transaction?: string }
      ) => {
        console.log("=== Payment Success Callback ===");
        console.log("Callback received:", paymentResult);
        console.log("Stored content available?", !!paymentResponseContent);

        try {
          // Use the intercepted content if available
          if (paymentResponseContent) {
            console.log("✅ Using intercepted payment content");
            const html = paymentResponseContent;

            // Replace the entire document (same as EVM chains)
            document.open();
            document.write(html);
            document.close();
            return;
          }

          // Fallback: show success message with transaction ID
          const txId =
            typeof paymentResult === "string"
              ? paymentResult
              : paymentResult?.transactionId ||
                paymentResult?.signature ||
                paymentResult?.transaction;

          console.log(
            "⚠️ No content available, showing fallback for txId:",
            txId
          );

          document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <div style="text-align: center; padding: 3rem; background: white; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px;">
                <div style="font-size: 5rem; margin-bottom: 1rem; animation: bounce 1s ease;">✅</div>
                <h1 style="margin-bottom: 1rem; color: #1a202c; font-size: 2rem;">Payment Successful!</h1>
                <div style="background: #f7fafc; padding: 1rem; border-radius: 0.5rem; margin: 1.5rem 0; word-break: break-all;">
                  <p style="color: #4a5568; font-size: 0.875rem; margin-bottom: 0.5rem;">Transaction ID:</p>
                  <p style="color: #2d3748; font-family: monospace; font-size: 0.75rem;">${txId}</p>
                </div>
                <p style="color: #718096; margin-top: 1rem;">Your payment has been processed successfully.</p>
              </div>
            </div>
            <style>
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
              }
            </style>
          `;
        } catch (error) {
          console.error("Error in onPaymentSuccess:", error);
        }
      }}
      onPaymentError={(error) => {
        console.error("Payment failed:", error);
      }}
    >
      <div></div>
    </X402Paywall>
  );
}

// Initialize the app when the window loads
window.addEventListener("load", () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x402 = (window as any).x402Solana;
  if (!x402) {
    console.error("x402Solana configuration not found");
    return;
  }

  const root = createRoot(rootElement);
  root.render(<PaywallApp x402Config={x402} />);
});
