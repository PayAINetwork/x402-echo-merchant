import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://x402.payai.network";

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
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="x402-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
