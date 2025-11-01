import * as esbuild from "esbuild";
import { htmlPlugin } from "@craftamap/esbuild-plugin-html";
import fs from "node:fs";
import path from "node:path";
import { getBaseTemplate } from "./baseTemplate";

// Build script for Solana paywall
const DIST_DIR = "src/paywall/dist";
const OUTPUT_HTML = path.join(DIST_DIR, "solana-paywall.html");
const OUTPUT_TS = path.join("src/paywall/gen", "solana-template.ts");

const options: esbuild.BuildOptions = {
  entryPoints: ["src/paywall/solana-index.tsx"],
  bundle: true,
  metafile: true,
  outdir: DIST_DIR,
  treeShaking: true,
  minify: true,
  format: "iife",
  sourcemap: false,
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  jsxImportSource: "react",
  define: {
    "process.env.NODE_ENV": '"development"',
    global: "globalThis",
    Buffer: "globalThis.Buffer",
  },
  mainFields: ["browser", "module", "main"],
  conditions: ["browser"],
  plugins: [
    htmlPlugin({
      files: [
        {
          entryPoints: ["src/paywall/solana-index.tsx"],
          filename: "solana-paywall.html",
          title: "Solana Payment Required",
          scriptLoading: "module",
          inline: {
            css: true,
            js: true,
          },
          htmlTemplate: getBaseTemplate(),
        },
      ],
    }),
  ],
  inject: ["./src/paywall/buffer-polyfill.ts"],
  external: [],
  alias: {
    stream: "stream-browserify",
    crypto: "crypto-browserify",
  },
};

async function build() {
  try {
    if (!fs.existsSync(DIST_DIR)) {
      fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    const genDir = path.dirname(OUTPUT_TS);
    if (!fs.existsSync(genDir)) {
      fs.mkdirSync(genDir, { recursive: true });
    }

    await esbuild.build(options);
    console.log("Solana paywall build completed successfully!");

    if (fs.existsSync(OUTPUT_HTML)) {
      const html = fs.readFileSync(OUTPUT_HTML, "utf8");

      const tsContent = `// THIS FILE IS AUTO-GENERATED - DO NOT EDIT
/**
 * The pre-built, self-contained Solana paywall template with inlined CSS and JS
 */
export const SOLANA_PAYWALL_TEMPLATE = ${JSON.stringify(html)};
`;

      fs.writeFileSync(OUTPUT_TS, tsContent);
      console.log(`Generated solana-template.ts with bundled HTML (${html.length} bytes)`);
    } else {
      throw new Error(`Bundled HTML file not found at ${OUTPUT_HTML}`);
    }
  } catch (error) {
    console.error("Solana paywall build failed:", error);
    process.exit(1);
  }
}

build();
