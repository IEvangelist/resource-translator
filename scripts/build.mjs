// Bundles src/index.ts into dist/resource-translator/index.js for the GitHub Action runtime.
// Uses esbuild because it handles modern ESM-only @actions/* packages cleanly while emitting
// a single self-contained CommonJS file that Node can execute directly.

import { build } from "esbuild";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outdir = resolve(root, "dist/resource-translator");
const outfile = resolve(outdir, "index.js");
const metaDir = resolve(root, "lib");
const metafilePath = resolve(metaDir, "esbuild-metafile.json");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
mkdirSync(metaDir, { recursive: true });

const result = await build({
  entryPoints: [resolve(root, "src/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  minify: false,
  sourcemap: false,
  legalComments: "external",
  metafile: true,
  logLevel: "info",
});

writeFileSync(metafilePath, JSON.stringify(result.metafile, null, 2));

console.log(`Bundle written to ${outfile}`);
console.log(`Metafile written to ${metafilePath}`);

