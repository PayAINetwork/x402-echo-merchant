"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Copy,
  ExternalLink,
  Github,
  Heart,
  Code,
  Globe,
  ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const API_URL = process.env.NEXT_PUBLIC_SITE_URL;

const MAINNET_ENDPOINTS = [
  {
    label: "Solana Mainnet",
    url: `${API_URL}/api/solana/paid-content`,
  },
  {
    label: "Base Mainnet",
    url: `${API_URL}/api/base/paid-content`,
  },
  {
    label: "Polygon Mainnet",
    url: `${API_URL}/api/polygon/paid-content`,
  },
  {
    label: "xLayer Mainnet",
    url: `${API_URL}/api/xlayer/paid-content`,
  },
  {
    label: "Peaq Mainnet",
    url: `${API_URL}/api/peaq/paid-content`,
  },
  // {
  //   label: 'Avalanche Mainnet',
  //   url: `${API_URL}/api/avalanche/paid-content`,
  // },
  {
    label: "Sei Mainnet",
    url: `${API_URL}/api/sei/paid-content`,
  },
];

const TESTNET_ENDPOINTS = [
  {
    label: "Solana Devnet",
    url: `${API_URL}/api/solana-devnet/paid-content`,
  },
  {
    label: "Base Sepolia",
    url: `${API_URL}/api/base-sepolia/paid-content`,
  },
  {
    label: "Avalanche Fuji",
    url: `${API_URL}/api/avalanche-fuji/paid-content`,
  },
  {
    label: "Polygon Amoy",
    url: `${API_URL}/api/polygon-amoy/paid-content`,
  },
  {
    label: "xLayer Testnet",
    url: `${API_URL}/api/xlayer-testnet/paid-content`,
  },
  {
    label: "Sei Testnet",
    url: `${API_URL}/api/sei-testnet/paid-content`,
  },
];

// Quickstart examples removed in favor of docs links

const RESOURCES = [
  {
    label: "x402",
    url: "https://x402.org",
    icon: <ExternalLink className="w-4 h-4 text-indigo-600" />,
  },
  {
    label: "x402 github",
    url: "https://github.com/coinbase/x402",
    icon: <Github className="w-4 h-4 text-indigo-600" />,
  },
  {
    label: "x402 Echo Merchant Github",
    url: "https://github.com/notorious-d-e-v/x402-echo-server",
    icon: <Github className="w-4 h-4 text-indigo-600" />,
  },
];

// CodeBlock removed with inline examples

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-background text-gray-900 dark:text-foreground flex flex-col items-center px-4 sm:px-6">
      {/* Theme Toggle Button */}
      <div className="w-full max-w-2xl flex justify-end pt-4 sm:pt-6 px-4 sm:px-0">
        <ThemeToggle />
      </div>
      {/* Hero Section */}
      <section className="w-full max-w-2xl mx-auto pt-12 sm:pt-16 pb-6 sm:pb-8 flex flex-col items-center text-center px-4 sm:px-0">
        <h1 className="text-4xl sm:text-5xl font-semibold mb-4 tracking-tight">
          402 Echo
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-muted-foreground mb-8 max-w-xl leading-relaxed">
          Try the{" "}
          <a
            href="https://x402.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 font-medium"
          >
            x402 protocol
          </a>{" "}
          for free.
          <br />
          Your payment is instantly refunded.
        </p>

        {/* Inline Scroll Indicator */}
        <div
          className="flex flex-col items-center gap-3 mt-6 mb-4 cursor-pointer group"
          onClick={() =>
            document
              .getElementById("quickstart-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors">
            Ready to get started?
          </span>
          <div className="scroll-indicator">
            <ChevronDown className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors" />
          </div>
        </div>

        <Card className="w-full bg-card border border-border shadow-none mb-4 mt-8">
          <CardContent className="py-4 px-4 sm:py-6 sm:px-6 flex flex-col gap-4">
            <div className="text-base text-foreground font-medium mb-2">
              Test your x402 client against:
            </div>
            <div className="text-sm text-muted-foreground font-semibold mt-4 mb-1">
              Testnets
            </div>
            {TESTNET_ENDPOINTS.map((ep) => (
              <div key={ep.label} className="mb-3">
                <div className="text-sm text-foreground font-medium mb-2">
                  {ep.label}
                </div>
                <div className="bg-muted rounded-md px-3 py-3 border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={ep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium truncate flex-1 min-w-0 font-mono"
                    >
                      {ep.url.replace(API_URL || "", "")}
                    </a>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <CopyButton url={ep.url} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="text-sm text-muted-foreground font-semibold mt-1 mb-1">
              Mainnets
            </div>
            {MAINNET_ENDPOINTS.map((ep) => (
              <div key={ep.label} className="mb-3">
                <div className="text-sm text-foreground font-medium mb-2">
                  {ep.label}
                </div>
                <div className="bg-muted rounded-md px-3 py-3 border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={ep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium truncate flex-1 min-w-0 font-mono"
                    >
                      {ep.url.replace(API_URL || "", "")}
                    </a>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <CopyButton url={ep.url} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Quickstart Section (cards linking to docs) */}
      <section
        id="quickstart-section"
        className="w-full max-w-2xl mx-auto pt-6 sm:pt-8 pb-12 sm:pb-16 px-4 sm:px-0"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold mb-8 sm:mb-16 text-center">
          Quickstart Guides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <a
            href="https://docs.payai.network/x402/servers/typescript/nextjs"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full hover:border-indigo-300 transition-colors">
              <CardContent className="p-5 flex flex-col">
                <div className="mb-3 p-2 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 w-fit">
                  <Code className="w-5 h-5" />
                </div>
                <div className="font-semibold">Next.js Quickstart</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Build a paywall-protected Next.js app with x402.
                </p>
                <span className="mt-3 inline-flex items-center text-indigo-600 dark:text-indigo-400 text-sm">
                  Read the guide <ExternalLink className="w-4 h-4 ml-1" />
                </span>
              </CardContent>
            </Card>
          </a>
          <a
            href="https://docs.payai.network/x402/servers/typescript/express"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full hover:border-indigo-300 transition-colors">
              <CardContent className="p-5 flex flex-col">
                <div className="mb-3 p-2 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 w-fit">
                  <Code className="w-5 h-5" />
                </div>
                <div className="font-semibold">Express Quickstart</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Add x402 middleware to your Express server in minutes.
                </p>
                <span className="mt-3 inline-flex items-center text-indigo-600 dark:text-indigo-400 text-sm">
                  Read the guide <ExternalLink className="w-4 h-4 ml-1" />
                </span>
              </CardContent>
            </Card>
          </a>
          <a
            href="https://docs.payai.network/x402/servers/typescript/hono"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full hover:border-indigo-300 transition-colors">
              <CardContent className="p-5 flex flex-col">
                <div className="mb-3 p-2 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 w-fit">
                  <Code className="w-5 h-5" />
                </div>
                <div className="font-semibold">Hono Quickstart</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Integrate x402 payments into your Hono API with ease.
                </p>
                <span className="mt-3 inline-flex items-center text-indigo-600 dark:text-indigo-400 text-sm">
                  Read the guide <ExternalLink className="w-4 h-4 ml-1" />
                </span>
              </CardContent>
            </Card>
          </a>
          <a
            href="https://facilitator.payai.network"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
              <CardContent className="p-5 flex flex-col">
                <div className="mb-3 p-2 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 w-fit">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="font-semibold">PayAI Facilitator</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Explore the PayAI Facilitator service powering x402 payments.
                </p>
                <span className="mt-3 inline-flex items-center text-indigo-600 dark:text-indigo-400 text-sm">
                  Visit Facilitator <ExternalLink className="w-4 h-4 ml-1" />
                </span>
              </CardContent>
            </Card>
          </a>
        </div>
      </section>
      {/* Resources Section */}
      <section className="w-full max-w-2xl mx-auto py-8 sm:py-16 px-4 sm:px-0">
        <h3 className="text-xl font-semibold mb-6 text-center">Resources</h3>
        <ul className="flex flex-col gap-4 items-center">
          {RESOURCES.map((res) => (
            <li key={res.url} className="flex items-center gap-2">
              {res.icon}
              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline hover:text-indigo-800 text-base font-medium"
              >
                {res.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
      {/* Footer */}
      <footer className="w-full py-6 sm:py-8 flex justify-center items-center border-t border-gray-100 mt-6 sm:mt-8 px-4 sm:px-0">
        <span className="text-gray-500 text-sm flex items-center gap-1">
          Made with{" "}
          <Heart className="inline w-4 h-4 text-pink-500 mx-1" fill="#ec4899" />{" "}
          by{" "}
          <a
            href="https://payai.network"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline hover:text-indigo-800 font-medium"
          >
            PayAI
          </a>
        </span>
      </footer>
    </main>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        className={`opacity-70 hover:opacity-100 transition-colors ${
          copied ? "text-green-600 dark:text-green-400" : ""
        }`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch (err) {
            console.error("Failed to copy:", err);
          }
        }}
        aria-label="Copy URL"
      >
        <Copy className="w-4 h-4" />
        <span className="sr-only">Copy URL</span>
      </Button>
      {copied && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10">
          <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-md border whitespace-nowrap">
            Copied!
          </span>
        </div>
      )}
    </div>
  );
}
