import { PAYWALL_TEMPLATE } from './gen/template';

type PaywallOptions = {
  amount: number;
  paymentRequirements: unknown[];
  currentUrl: string;
  testnet: boolean;
  cdpClientKey?: string;
  appName?: string;
  appLogo?: string;
  sessionTokenEndpoint?: string;
  config?: Record<string, unknown>;
  rpcUrl?: string;
  /** V2 PaymentRequired.extensions (server-declared facilitator extensions). */
  extensions?: Record<string, unknown>;
};

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function getLocalPaywallHtml({
  amount,
  testnet,
  paymentRequirements,
  currentUrl,
  cdpClientKey,
  appName,
  appLogo,
  sessionTokenEndpoint,
  config = {},
  rpcUrl,
  extensions,
}: PaywallOptions): string {
  const extensionsJson =
    extensions && Object.keys(extensions).length > 0 ? JSON.stringify(extensions) : 'undefined';
  const configScript = `
  <script>
    window.x402 = {
      amount: ${Number.isFinite(amount) ? amount : 0},
      testnet: ${!!testnet},
      paymentRequirements: ${JSON.stringify(paymentRequirements)},
      currentUrl: "${escapeString(currentUrl)}",
      config: {
        chainConfig: ${JSON.stringify(config)},
      },
      cdpClientKey: "${escapeString(cdpClientKey || '')}",
      appName: "${escapeString(appName || '')}",
      appLogo: "${escapeString(appLogo || '')}",
      sessionTokenEndpoint: "${escapeString(sessionTokenEndpoint || '')}",
      rpcUrl: "${escapeString(rpcUrl || '')}",
      extensions: ${extensionsJson},
    };
  </script>`;

  return PAYWALL_TEMPLATE.replace('</head>', `${configScript}\n</head>`);
}
