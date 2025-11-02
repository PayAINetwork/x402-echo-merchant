import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@payai/x402-solana-react/styles";
import "@solana/wallet-adapter-react-ui/styles.css";

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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
