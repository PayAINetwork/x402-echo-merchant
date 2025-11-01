import { createRoot } from "react-dom/client";
import { X402Paywall } from "@payai/x402-solana-react";
import "@payai/x402-solana-react/styles";
import "@solana/wallet-adapter-react-ui/styles.css";

// Initialize the app when the window loads
window.addEventListener("load", () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }

  const x402 = (window as any).x402Solana;
  if (!x402) {
    console.error("x402Solana configuration not found");
    return;
  }

  const root = createRoot(rootElement);
  root.render(
    <X402Paywall
      amount={x402.amount}
      description={x402.description}
      network={x402.network}
      onPaymentSuccess={(txId) => {
        console.log("Payment successful!", txId);
        // Reload to show content
        window.location.reload();
      }}
      onPaymentError={(error) => {
        console.error("Payment failed:", error);
      }}
    >
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>✅ Payment Successful!</h2>
        <p>Your premium content is loading...</p>
      </div>
    </X402Paywall>
  );
});
