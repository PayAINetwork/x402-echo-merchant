import { createRoot } from "react-dom/client";
import { useState } from "react";
import { X402Paywall } from "@payai/x402-solana-react";
import "@payai/x402-solana-react/styles";
import "@solana/wallet-adapter-react-ui/styles.css";

function PaywallApp({ x402Config }: { x402Config: any }) {
  const [transactionId, setTransactionId] = useState<string | undefined>();

  return (
    <X402Paywall
      amount={x402Config.amount}
      description={x402Config.description}
      network={x402Config.network}
      treasuryAddress={x402Config.treasuryAddress}
      facilitatorUrl={x402Config.facilitatorUrl}
      apiEndpoint={x402Config.apiEndpoint}
      onPaymentSuccess={(txId) => {
        console.log("Payment successful!", txId);
        setTransactionId(txId);
        // Reload after a brief delay to show success UI
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }}
      onPaymentError={(error) => {
        console.error("Payment failed:", error);
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "var(--background-color)",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            padding: "2rem",
            backgroundColor: "var(--container-background-color)",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "1rem",
              color: "var(--text-color)",
            }}
          >
            Payment Successful!
          </h2>
          <p style={{ color: "var(--secondary-text-color)", marginBottom: "1rem" }}>
            Your premium content is loading...
          </p>
          {transactionId && (
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--secondary-text-color)",
                wordBreak: "break-all",
              }}
            >
              Transaction: {transactionId}
            </p>
          )}
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <div className="animate-spin" style={{ fontSize: "1.5rem" }}>
              ⏳
            </div>
            <span style={{ color: "var(--secondary-text-color)" }}>Redirecting...</span>
          </div>
        </div>
      </div>
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
