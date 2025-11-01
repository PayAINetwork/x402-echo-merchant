import { SOLANA_PAYWALL_TEMPLATE } from "./gen/solana-template";

type SolanaPaywallOptions = {
  amount: number;
  paymentRequirements: unknown[];
  currentUrl: string;
  network: 'solana' | 'solana-devnet';
  description?: string;
};

function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

export function getSolanaPaywallHtml({
  amount,
  network,
  paymentRequirements,
  currentUrl,
  description,
}: SolanaPaywallOptions): string {
  const displayDescription = description || 'Premium Content Access';
  
  // Inject x402Solana configuration into the template
  const configScript = `
  <script>
    window.x402Solana = {
      amount: ${Number.isFinite(amount) ? amount : 0},
      network: "${escapeString(network)}",
      paymentRequirements: ${JSON.stringify(paymentRequirements)},
      currentUrl: "${escapeString(currentUrl)}",
      description: "${escapeString(displayDescription)}"
    };
  </script>`;

  return SOLANA_PAYWALL_TEMPLATE.replace("</head>", `${configScript}\n</head>`);
}
