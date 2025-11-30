import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@payai/x402-solana-react/styles";
import "@solana/wallet-adapter-react-ui/styles.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://x402.payai.network";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "x402 Echo — Test x402 payments",
    template: "%s — x402 Echo",
  },
  description:
    "Try x402 payments against a live merchant today. Get 100% of your payment refunded.",
  applicationName: "x402 Echo Merchant",
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "x402 Echo Merchant",
    title: "x402 Echo — Test x402 payments",
    description:
      "Try x402 payments against a live merchant today. Get 100% of your payment refunded.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "x402 Echo Merchant homepage image",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "x402 Echo — Test x402 payments",
    description:
      "Try x402 payments against a live merchant today. Get 100% of your payment refunded.",
    images: [
      {
        url: "/opengraph-image.png",
        alt: "x402 Echo Merchant homepage image",
      },
    ],
    site: "@PayAINetwork",
  },
  robots: {
    index: true,
    follow: true,
  },
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProd = process.env.NODE_ENV === "production";
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isProd && (
          <Script id="gtm-base" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-N5V93RM6');`}</Script>
        )}
        {isProd && (
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-N5V93RM6"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            ></iframe>
          </noscript>
        )}
        {children}
      </body>
    </html>
  );
}
