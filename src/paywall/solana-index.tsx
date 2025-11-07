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
      onPaymentSuccess={async (txId: string) => {
        console.log("Payment successful!", txId);

        // Wait a moment for the payment to settle, then fetch the success page
        setTimeout(async () => {
          try {
            // Fetch the success page from the server
            // The middleware will have the payment info and serve the correct HTML
            const response = await fetch(x402Config.apiEndpoint, {
              method: "GET",
              headers: {
                Accept: "text/html",
              },
              credentials: "same-origin",
            });

            if (
              response.ok &&
              response.headers.get("content-type")?.includes("text/html")
            ) {
              const html = await response.text();
              // Replace the entire page with the server's HTML
              document.open();
              document.write(html);
              document.close();
            }
          } catch (error) {
            console.error("Error fetching success page:", error);
          }
        }, 1500); // Wait 1.5 seconds for settlement to complete
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
          <p
            style={{
              color: "var(--secondary-text-color)",
              marginBottom: "1rem",
            }}
          >
            Loading your success page...
          </p>
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
            <span style={{ color: "var(--secondary-text-color)" }}>
              Please wait...
            </span>
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
