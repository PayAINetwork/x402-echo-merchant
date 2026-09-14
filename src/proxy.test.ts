// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { paymentMiddleware } from './proxy';
import { NETWORK_TO_CAIP2, type PaymentRequired, type RouteConfig } from './lib/x402-helpers';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  settle: vi.fn(),
  supported: vi.fn(),
  refund: vi.fn(),
  paidContent: vi.fn(),
  evmHtml: vi.fn(() => '<html>EVM paywall</html>'),
  svmHtml: vi.fn(() => '<html>Solana paywall</html>'),
}));

vi.mock('./lib/facilitator', () => ({ useFacilitator: () => mocks }));
vi.mock('./lib/refund-service', () => ({ processSettlementRefund: mocks.refund }));
vi.mock('./lib/paidContentHandler', () => ({ handlePaidContentRequest: mocks.paidContent }));
vi.mock('./paywall/getPaywallHtml', () => ({ getLocalPaywallHtml: mocks.evmHtml }));
vi.mock('./paywall/getSolanaPaywallHtml', () => ({ getSolanaPaywallHtml: mocks.svmHtml }));

const recipient = '0x0000000000000000000000000000000000000001';
const path = '/api/demo/paid-content';
const url = `https://merchant.example${path}`;

function challenge(response: Response): PaymentRequired {
  expect(response.status).toBe(402);
  expect(response.headers.get('PAYMENT-RESPONSE')).toBeNull();
  const header = response.headers.get('PAYMENT-REQUIRED');
  expect(header).toBeTruthy();
  return JSON.parse(Buffer.from(header!, 'base64').toString('utf8'));
}

function handler(network: RouteConfig['network'], config: RouteConfig['config'] = {}) {
  return paymentMiddleware(recipient, { [path]: { price: '$0.01', network, config } });
}

describe('unsigned v2 resource challenges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // These are entirely local tests: no RPC, facilitator, or payment requests.
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network request'); }));
    mocks.supported.mockResolvedValue({
      kinds: ['solana', 'solana-devnet'].map(network => ({
        x402Version: 2,
        scheme: 'exact',
        network: NETWORK_TO_CAIP2[network],
        extra: { feePayer: 'mock-fee-payer' },
      })),
      extensions: ['eip2612GasSponsoring', 'erc20ApprovalGasSponsoring'],
    });
  });

  afterEach(() => {
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.settle).not.toHaveBeenCalled();
    expect(mocks.refund).not.toHaveBeenCalled();
    expect(mocks.paidContent).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each(['base-sepolia', 'solana-devnet', 'solana', 'skale-base-sepolia'] as const)(
    'includes matching resource metadata in JSON and header for %s', async network => {
      const response = await handler(network)(new NextRequest(`${url}?amount=0.01`));
      const required = challenge(response);
      expect(required.resource).toEqual({ url, description: '', mimeType: 'application/json' });
      expect(required.x402Version).toBe(2);
      expect(required.accepts).toHaveLength(1);
      expect(required.accepts[0]).toMatchObject({ network: NETWORK_TO_CAIP2[network], amount: '10000' });
      expect(await response.json()).toEqual({ ...required, error: 'PAYMENT-SIGNATURE header is required' });
      expect(required).not.toHaveProperty('extensions');
    },
  );

  it('preserves explicit resource, MIME type, and Unicode description', async () => {
    const resource = { url: 'https://merchant.example/canonical', description: 'Café — 支払い', mimeType: 'text/plain' };
    const response = await handler('base-sepolia', { resource: resource.url, description: resource.description, mimeType: resource.mimeType })(new NextRequest(url));
    expect(challenge(response).resource).toEqual(resource);
  });

  it.each(['base-sepolia', 'solana-devnet'] as const)(
    'adds the same challenge to the unchanged %s browser paywall', async network => {
      const serve = handler(network, { description: 'Demo content' });
      const json = challenge(await serve(new NextRequest(url)));
      const html = await serve(new NextRequest(url, { headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' } }));
      expect(challenge(html)).toEqual(json);
      expect(html.headers.get('Content-Type')).toBe('text/html');
      expect(html.headers.get('Cross-Origin-Opener-Policy')).toBe('unsafe-none');
      expect(await html.text()).toBe(network === 'base-sepolia' ? '<html>EVM paywall</html>' : '<html>Solana paywall</html>');
    },
  );

  it('preserves custom paywall HTML exactly', async () => {
    const customPaywallHtml = '<html><body>Existing custom paywall</body></html>';
    const response = await handler('base-sepolia', { customPaywallHtml })(new NextRequest(url, { headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' } }));
    expect(challenge(response).resource?.url).toBe(url);
    expect(await response.text()).toBe(customPaywallHtml);
    expect(mocks.evmHtml).not.toHaveBeenCalled();
    expect(mocks.svmHtml).not.toHaveBeenCalled();
  });

  it('keeps advertised extensions and payment requirements in both representations', async () => {
    const serve = handler('base-sepolia');
    const requestUrl = `${url}?assetTransferMethod=permit2`;
    const response = await serve(new NextRequest(requestUrl));
    const required = challenge(response);
    expect(required.extensions).toHaveProperty('eip2612GasSponsoring');
    expect(required.extensions).toHaveProperty('erc20ApprovalGasSponsoring');
    expect(required.accepts[0]?.extra.assetTransferMethod).toBe('permit2');
    expect((await response.json()).extensions).toEqual(required.extensions);
    const html = await serve(new NextRequest(requestUrl, { headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' } }));
    expect(challenge(html)).toEqual(required);
  });

  it('leaves nonmatching routes alone', async () => {
    const response = await handler('base-sepolia')(new NextRequest('https://merchant.example/other'));
    expect(response.status).toBe(200);
    expect(response.headers.get('PAYMENT-REQUIRED')).toBeNull();
    expect(mocks.supported).not.toHaveBeenCalled();
  });
});
