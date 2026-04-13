/**
 * The Solana React paywall package exposes its stylesheet through the
 * `@payai/x402-solana-react/styles` subpath, but it does not publish a
 * matching TypeScript declaration for that CSS entrypoint.
 *
 * This ambient module keeps Next.js type-checking happy while preserving
 * the existing side-effect CSS imports used by the app and paywall bundle.
 */
declare module '@payai/x402-solana-react/styles' {
  const stylesheetUrl: string;
  export default stylesheetUrl;
}
