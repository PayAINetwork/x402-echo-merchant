import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getExplorerForNetwork(network: string) {
  if (network === "base-sepolia") {
    return "https://sepolia.basescan.org/tx/";
  } else if (network === "base") {
    return "https://basescan.org/tx/";
  } else if (network === "solana-devnet") {
    return "https://solscan.io/tx/";
  } else if (network === "solana") {
    return "https://solscan.io/tx/";
  } else if (network === "avalanche") {
    return "https://snowtrace.io/tx/";
  } else if (network === "avalanche-fuji") {
    return "https://testnet.snowtrace.io/tx/";
  } else if (network === "sei") {
    return "https://seistream.app/transactions/";
  } else if (network === "sei-testnet") {
    return "https://testnet.seistream.app/transactions/";
  } else if (network === "iotex") {
    return "https://iotexscan.io/tx/";
  } else if (network === "polygon") {
    return "https://polygonscan.com/tx/";
  } else if (network === "polygon-amoy") {
    return "https://amoy.polygonscan.com/tx/";
  } else if (network === "peaq") {
    return "https://peaq.subscan.io/tx/";
  } else if (network === "xlayer") {
    return "https://www.oklink.com/x-layer/tx/";
  } else if (network === "xlayer-testnet") {
    return "https://www.oklink.com/x-layer-testnet/tx/";
  }
}

export function renderRizzlerHtml(
  paymentResponse: { transaction: string; network: string; payer: string },
  refundTxHash?: string
) {
  const paymentTx = paymentResponse.transaction || "N/A";
  const refundFailed = !refundTxHash;

  // Determine explorer base URL
  let explorerBase = "";
  const isSolanaDevnet = paymentResponse.network === "solana-devnet";
  if (paymentResponse.network === "base-sepolia") {
    explorerBase = "https://sepolia.basescan.org/tx/";
  } else if (paymentResponse.network === "base") {
    explorerBase = "https://basescan.org/tx/";
  } else if (paymentResponse.network === "solana-devnet") {
    explorerBase = "https://solscan.io/tx/";
  } else if (paymentResponse.network === "solana") {
    explorerBase = "https://solscan.io/tx/";
  } else if (paymentResponse.network === "avalanche") {
    explorerBase = "https://snowtrace.io/tx/";
  } else if (paymentResponse.network === "avalanche-fuji") {
    explorerBase = "https://testnet.snowtrace.io/tx/";
  } else if (paymentResponse.network === "sei") {
    explorerBase = "https://seistream.app/transactions/";
  } else if (paymentResponse.network === "sei-testnet") {
    explorerBase = "https://testnet.seistream.app/transactions/";
  } else if (paymentResponse.network === "iotex") {
    explorerBase = "https://iotexscan.io/tx/";
  } else if (paymentResponse.network === "polygon") {
    explorerBase = "https://polygonscan.com/tx/";
  } else if (paymentResponse.network === "polygon-amoy") {
    explorerBase = "https://amoy.polygonscan.com/tx/";
  } else if (paymentResponse.network === "peaq") {
    explorerBase = "https://peaq.subscan.io/tx/";
  } else if (paymentResponse.network === "xlayer") {
    explorerBase = "https://www.oklink.com/x-layer/tx/";
  } else if (paymentResponse.network === "xlayer-testnet") {
    explorerBase = "https://www.oklink.com/x-layer-testnet/tx/";
  }

  const paymentTxLink = paymentTx
    ? `${explorerBase}${paymentTx}${isSolanaDevnet ? "?cluster=devnet" : ""}`
    : null;
  const refundTxLink = refundTxHash
    ? `${explorerBase}${refundTxHash}${isSolanaDevnet ? "?cluster=devnet" : ""}`
    : null;

  const paymentResponseJson = JSON.stringify(paymentResponse, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Successful - x402 Echo</title>
  <link rel="icon" href="/favicon.ico" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f9fafb;
      color: #1f2937;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    .main-content {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      min-height: 560px;
    }
    .left-column {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 3rem 2.5rem;
      border-right: 1px solid #e5e7eb;
    }
    .right-column {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 3rem 2.5rem;
      background: #fcfcfd;
    }
    .success-header {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
    }
    .success-icon {
      width: 48px;
      height: 48px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: #fff;
      flex-shrink: 0;
      margin-top: 0.25rem;
    }
    .success-text {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .success-subtitle {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #10b981;
      text-transform: uppercase;
    }
    .success-title {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.45px;
      color: #111827;
    }
    .success-copy {
      font-size: 0.95rem;
      color: #6b7280;
      font-weight: 400;
      line-height: 1.6;
    }
    .gif-container {
      text-align: center;
      margin-bottom: 2rem;
    }
    .gif {
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      width: 100%;
      max-width: 400px;
      height: auto;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .info-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.75rem;
    }
    .tx {
      font-family: 'SF Mono', Menlo, Monaco, monospace;
      color: #111827;
      font-size: 0.95rem;
      word-break: break-all;
      overflow-wrap: anywhere;
      line-height: 1.6;
    }
    .tx-link {
      color: #2563eb;
      text-decoration: none;
      transition: color 0.2s;
    }
    .tx-link:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
    .refund { color: #10b981; }
    .refund-failed { color: #dc2626; font-weight: 500; }
    .code-section {
      margin-bottom: 2.5rem;
    }
    .code-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .code-block {
      background: #1f2937;
      border-radius: 12px;
      padding: 1.5rem;
      font-family: 'SF Mono', Menlo, Monaco, monospace;
      font-size: 0.875rem;
      color: #d1d5db;
      overflow-x: auto;
      border: 1px solid #374151;
    }
    .code-block pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.875rem 1.75rem;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      font-size: 0.95rem;
      flex: 1;
      min-width: 160px;
    }
    .btn-primary {
      background: #111827;
      color: #fff;
      border: 1px solid #111827;
    }
    .btn-primary:hover {
      background: #000;
      border-color: #000;
    }
    .btn-secondary {
      background: #fff;
      color: #111827;
      border: 1px solid #e5e7eb;
    }
    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
    .quickstart-section {
      padding-top: 0;
      margin-bottom: 0;
      margin-top: auto;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 1.25rem;
    }
    .cards-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .card:hover {
      border-color: #111827;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .card-icon {
      width: 36px;
      height: 36px;
      background: #f3f4f6;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.125rem;
    }
    .card-content {
      flex: 1;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.25rem;
    }
    .card-description {
      font-size: 0.8125rem;
      color: #6b7280;
      line-height: 1.4;
    }
    .card-link {
      display: inline-flex;
      align-items: center;
      color: #2563eb;
      font-size: 0.8125rem;
      font-weight: 500;
      flex-shrink: 0;
    }
    .footer {
      background: #f9fafb;
      padding: 2rem;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 0.95rem;
    }
    .footer-heart {
      color: #ef4444;
      font-size: 1.2em;
      vertical-align: middle;
      margin: 0 0.25em;
    }
    .footer a {
      color: #111827;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media (max-width: 640px) {
      body { padding: 1rem 0.5rem; }
      .main-content {
        grid-template-columns: 1fr;
        gap: 1.5rem;
        padding: 0;
      }
      .left-column,
      .right-column {
        padding: 2rem 1.5rem;
        border-right: none;
      }
      .right-column {
        border-top: 1px solid #e5e7eb;
        background: #fff;
      }
      .success-header {
        flex-direction: column;
        gap: 1rem;
      }
      .actions { flex-direction: column; }
      .btn { min-width: auto; }
      .card {
        flex-direction: column;
        align-items: flex-start;
      }
      .card-link {
        margin-top: 0.5rem;
      }
      .quickstart-section {
        margin-top: 2rem;
      }
    }
    @media (min-width: 641px) and (max-width: 1024px) {
      .main-content {
        gap: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="main-content">
      <div class="left-column">
        <div class="success-header">
          <div class="success-icon">✓</div>
          <div class="success-text">
            <span class="success-subtitle">Payment Successful</span>
            <h1 class="success-title">Thank you for your payment</h1>
            <p class="success-copy">Your payment has been received and automatically refunded.</p>
          </div>
        </div>

        <!-- <div class="gif-container">
          <img src="/rizzler.gif" alt="Success animation" class="gif" />
        </div> -->

        <div class="info-grid">
          <div>
            <div class="label" style="margin-bottom: 0.5rem;">Network: ${
              paymentResponse.network
            }</div>
            <div class="info-card">
              <div class="tx">${
                paymentTxLink
                  ? `<a href="${paymentTxLink}" class="tx-link" target="_blank" rel="noopener noreferrer">${paymentTx}</a>`
                  : paymentTx
              }</div>
            </div>
          </div>
          <div class="info-card">
            <div class="label">Refund ${
              refundFailed ? "Status" : "Transaction"
            }</div>
            <div class="tx ${refundFailed ? "refund-failed" : "refund"}">${
    refundFailed
      ? "Refund failed - Please contact support"
      : `<a href="${refundTxLink}" class="tx-link" target="_blank" rel="noopener noreferrer">${refundTxHash}</a>`
  }
            </div>
          </div>
        </div>

        <div class="code-section">
          <div class="code-title">Payment Response Header</div>
          <div class="code-block"><pre><code>${paymentResponseJson}</code></pre></div>
        </div>

        <div class="actions">
          <a href="/" class="btn btn-primary">← Back to Home</a>
          <a href="https://docs.payai.network" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Documentation →</a>
        </div>
      </div>

      <div class="right-column">
        <div class="quickstart-section">
          <h2 class="section-title">Get Started with x402</h2>
          <div class="cards-grid">
            <a href="https://docs.payai.network/x402/servers/typescript/nextjs" target="_blank" rel="noopener noreferrer" class="card">
              <div class="card-icon">⚡</div>
              <div class="card-content">
                <div class="card-title">Next.js Quickstart</div>
                <div class="card-description">Build a paywall-protected Next.js app</div>
              </div>
              <span class="card-link">View →</span>
            </a>
            <a href="https://docs.payai.network/x402/servers/typescript/express" target="_blank" rel="noopener noreferrer" class="card">
              <div class="card-icon">🚀</div>
              <div class="card-content">
                <div class="card-title">Express Quickstart</div>
                <div class="card-description">Add x402 to your Express server</div>
              </div>
              <span class="card-link">View →</span>
            </a>
            <a href="https://docs.payai.network/x402/servers/typescript/hono" target="_blank" rel="noopener noreferrer" class="card">
              <div class="card-icon">🔥</div>
              <div class="card-content">
                <div class="card-title">Hono Quickstart</div>
                <div class="card-description">Integrate x402 into your Hono API</div>
              </div>
              <span class="card-link">View →</span>
            </a>
            <a href="https://facilitator.payai.network" target="_blank" rel="noopener noreferrer" class="card">
              <div class="card-icon">🌐</div>
              <div class="card-content">
                <div class="card-title">PayAI Facilitator</div>
                <div class="card-description">Explore the facilitator service</div>
              </div>
              <span class="card-link">Visit →</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      Made with <span class="footer-heart">♥</span> by <a href="https://payai.network" target="_blank" rel="noopener noreferrer">PayAI</a>
    </div>
  </div>

  <script>
    // Trigger confetti animation immediately
    if (typeof confetti !== 'undefined') {
      // Main confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Additional bursts for more celebration
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
      }, 250);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 500);
    } else {
      console.log('Confetti library not loaded');
    }
  </script>
</body>
</html>`;
}
