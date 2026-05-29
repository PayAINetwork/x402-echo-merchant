import type * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface InlineHtmlFileConfig {
  entryPoints: string[];
  filename: string;
  title?: string;
  scriptLoading?: 'module' | 'defer' | false;
  htmlTemplate?: string;
}

export interface InlineHtmlPluginOptions {
  files: InlineHtmlFileConfig[];
}

interface CollectedOutput {
  path: string;
}

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Required</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

/**
 * Collects esbuild output files for the configured entry points, including
 * CSS bundles emitted alongside JS entry points.
 */
function collectOutputFiles(
  config: InlineHtmlFileConfig,
  metafile: esbuild.Metafile,
): CollectedOutput[] {
  const collected = new Map<string, CollectedOutput>();

  for (const [outputPath, outputMeta] of Object.entries(metafile.outputs)) {
    if (!outputMeta.entryPoint || !config.entryPoints.includes(outputMeta.entryPoint)) {
      continue;
    }

    collected.set(outputPath, { path: outputPath });

    if (outputMeta.cssBundle) {
      collected.set(outputMeta.cssBundle, { path: outputMeta.cssBundle });
    }
  }

  return [...collected.values()];
}

/**
 * Escapes sequences that would prematurely terminate an inline <script> element.
 *
 * The HTML parser ends "script data" at the first `</script` and enters a special
 * escaped state on `<!--`. In a minified bundle these sequences only ever appear
 * inside string/regex literals (comments are stripped), so inserting a backslash
 * (`\/`, `\!`) keeps the JavaScript semantically identical while preventing the
 * browser from closing the tag early (which surfaced as `Unexpected token '<'`).
 */
function escapeScriptContents(js: string): string {
  return js.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}

/**
 * Injects inlined CSS/JS into an HTML template without using jsdom.
 * jsdom cannot parse Tailwind CSS v4 output and logs "Could not parse CSS stylesheet".
 */
function buildInlineHtml(
  html: string,
  cssBlocks: string[],
  jsBlocks: string[],
  scriptLoading?: InlineHtmlFileConfig['scriptLoading'],
): string {
  let result = html;

  if (cssBlocks.length > 0) {
    const styleTags = cssBlocks
      .map(css => `<style>${css.replace(/<\/style>/gi, '<\\/style>')}</style>`)
      .join('\n');
    // Use a function replacer so `$` sequences inside the inlined CSS are not
    // interpreted as `String.prototype.replace` patterns (e.g. `$&`, `$'`).
    result = result.replace('</head>', () => `${styleTags}\n</head>`);
  }

  if (jsBlocks.length > 0) {
    const scriptAttributes =
      scriptLoading === 'module'
        ? ' type="module"'
        : scriptLoading === 'defer' || scriptLoading === undefined
          ? ' defer'
          : '';

    const scriptTags = jsBlocks
      .map(js => `<script${scriptAttributes}>${escapeScriptContents(js)}</script>`)
      .join('\n');
    // Function replacer is required here: minified bundles contain `$&`, `$\``,
    // and similar sequences (e.g. `$` as a variable name) that would otherwise be
    // expanded as replacement patterns, corrupting the JS with the matched tag.
    result = result.replace('</body>', () => `${scriptTags}\n</body>`);
  }

  return result;
}

/**
 * Minimal HTML inlining plugin for paywall builds. Avoids jsdom so modern Tailwind CSS
 * can be inlined without build-time stylesheet parsing errors.
 */
export function inlineHtmlPlugin(options: InlineHtmlPluginOptions): esbuild.Plugin {
  return {
    name: 'inline-html-plugin',
    setup(build) {
      if (build.initialOptions.metafile === false) {
        throw new Error('metafile must be enabled for inlineHtmlPlugin');
      }
      build.initialOptions.metafile = true;

      const outdir = build.initialOptions.outdir;
      if (!outdir) {
        throw new Error('outdir must be set for inlineHtmlPlugin');
      }

      build.onEnd(async result => {
        if (!result.metafile) {
          return;
        }

        for (const fileConfig of options.files) {
          const outputFiles = collectOutputFiles(fileConfig, result.metafile);
          if (outputFiles.length === 0) {
            throw new Error(
              `No esbuild outputs found for ${fileConfig.filename} entry points: ${fileConfig.entryPoints.join(', ')}`,
            );
          }

          const cssBlocks: string[] = [];
          const jsBlocks: string[] = [];

          for (const outputFile of outputFiles) {
            const extension = path.extname(outputFile.path);
            const contents = await fs.readFile(outputFile.path, 'utf8');

            if (extension === '.css') {
              cssBlocks.push(contents);
            } else if (extension === '.js') {
              jsBlocks.push(contents);
            }
          }

          let html = (fileConfig.htmlTemplate ?? DEFAULT_HTML_TEMPLATE).trim();

          if (fileConfig.title) {
            html = html.replace(/<title>[^<]*<\/title>/i, `<title>${fileConfig.title}</title>`);
          }

          const inlinedHtml = buildInlineHtml(html, cssBlocks, jsBlocks, fileConfig.scriptLoading);
          const outputPath = path.join(outdir, fileConfig.filename);

          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, inlinedHtml);
        }
      });
    },
  };
}
