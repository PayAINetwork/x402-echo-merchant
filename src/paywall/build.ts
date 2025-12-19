import * as esbuild from 'esbuild';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { getBaseTemplate } from './baseTemplate';

// This file only runs at build time and generates a template HTML file
// Template variables are handled at runtime, not build time

/**
 * Moves all @import statements to the top of the CSS.
 * This is necessary because Tailwind v4 outputs @layer directives that must come after @import.
 * OnChainKit's CSS contains @import statements that end up in the middle of the processed CSS.
 */
function moveImportsToTop(css: string): string {
  const importRegex = /@import\s+(?:url\([^)]+\)|"[^"]+"|'[^']+')[^;]*;/g;
  const imports: string[] = [];

  // Extract all @import statements
  const cssWithoutImports = css.replace(importRegex, match => {
    imports.push(match);
    return '';
  });

  // Return imports first, then the rest of the CSS
  if (imports.length > 0) {
    return imports.join('\n') + '\n' + cssWithoutImports;
  }
  return css;
}

/**
 * Custom esbuild plugin to process CSS through PostCSS with Tailwind.
 * Content sources are specified via source() in the @import directive.
 */
const postcssPlugin: esbuild.Plugin = {
  name: 'postcss',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async args => {
      const source = await fs.promises.readFile(args.path, 'utf8');

      // Process CSS through PostCSS with Tailwind
      const result = await postcss([tailwindcss()]).process(source, {
        from: args.path,
      });

      // Move all @import statements to the top to fix CSS spec compliance
      const fixedCss = moveImportsToTop(result.css);

      return {
        contents: fixedCss,
        loader: 'css',
      };
    });
  },
};

const DIST_DIR = 'src/paywall/dist';
const OUTPUT_HTML = path.join(DIST_DIR, 'paywall.html');
const OUTPUT_TS = path.join('src/paywall/gen', 'template.ts');

// Path to Python package static directory (relative to this TypeScript package)
const PYTHON_DIR = path.join('..', '..', '..', 'python', 'x402', 'src', 'x402');
const OUTPUT_PY = path.join(PYTHON_DIR, 'template.py');

const options: esbuild.BuildOptions = {
  entryPoints: ['src/paywall/index.tsx', 'src/paywall/styles.css'],
  bundle: true,
  metafile: true,
  outdir: DIST_DIR,
  treeShaking: true,
  minify: true, // Use minify for production mode
  format: 'iife',
  sourcemap: false,
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  jsxImportSource: 'react',
  define: {
    'process.env.NODE_ENV': '"development"',
    global: 'globalThis',
    Buffer: 'globalThis.Buffer',
  },
  mainFields: ['browser', 'module', 'main'],
  conditions: ['browser'],
  plugins: [
    // Process CSS through PostCSS/Tailwind before bundling
    postcssPlugin,
    htmlPlugin({
      files: [
        {
          entryPoints: ['src/paywall/index.tsx', 'src/paywall/styles.css'],
          filename: 'paywall.html',
          title: 'Payment Required',
          scriptLoading: 'module',
          inline: {
            css: true,
            js: true,
          },
          htmlTemplate: getBaseTemplate(),
        },
      ],
    }),
  ],
  inject: ['./src/paywall/buffer-polyfill.ts'],
  alias: {
    stream: 'stream-browserify',
    crypto: 'crypto-browserify',
  },
};

// Run the build and then create the template.ts file
/**
 * Builds the paywall HTML template with bundled JS and CSS.
 * Creates a TypeScript file containing the template as a constant for runtime use.
 * Copies the generated HTML to the Python package's static directory.
 */
async function build() {
  try {
    // First, make sure the dist directory exists
    if (!fs.existsSync(DIST_DIR)) {
      fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    // Make sure gen directory exists too
    const genDir = path.dirname(OUTPUT_TS);
    if (!fs.existsSync(genDir)) {
      fs.mkdirSync(genDir, { recursive: true });
    }

    // Run esbuild to create the bundled HTML
    await esbuild.build(options);
    console.log('Build completed successfully!');

    // Read the generated HTML file
    if (fs.existsSync(OUTPUT_HTML)) {
      const html = fs.readFileSync(OUTPUT_HTML, 'utf8');

      // Generate a TypeScript file with the template as a constant
      const tsContent = `// THIS FILE IS AUTO-GENERATED - DO NOT EDIT
/**
 * The pre-built, self-contained paywall template with inlined CSS and JS
 */
export const PAYWALL_TEMPLATE = ${JSON.stringify(html)};
`;

      const pyContent = `PAYWALL_TEMPLATE = ${JSON.stringify(html)}`;

      // Write the template.ts file
      fs.writeFileSync(OUTPUT_TS, tsContent);
      console.log(`Generated template.ts with bundled HTML (${html.length} bytes)`);
      if (fs.existsSync(PYTHON_DIR)) {
        fs.writeFileSync(OUTPUT_PY, pyContent);
        console.log(`Generated template.py with bundled HTML (${html.length} bytes)`);
      } else {
        console.log('Python package path not found. Skipping template.py output.');
      }
    } else {
      throw new Error(`Bundled HTML file not found at ${OUTPUT_HTML}`);
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
