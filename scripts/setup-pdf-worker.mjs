/**
 * Vendors the pdf.js worker into `public/` so the reader can load it from our
 * own origin (`/pdf.worker.min.mjs`) rather than a CDN — keeps the app
 * local-first and avoids bundler-specific worker resolution under Turbopack.
 *
 * Runs on `postinstall`, `predev`, and `prebuild`. The copied file is
 * git-ignored; the version always matches the installed `pdfjs-dist`.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  let workerPath;
  try {
    // Resolve relative to the installed pdfjs-dist package (version-accurate).
    const pkg = require.resolve("pdfjs-dist/package.json");
    workerPath = join(dirname(pkg), "build", "pdf.worker.min.mjs");
  } catch {
    console.warn("[setup-pdf-worker] pdfjs-dist not installed yet — skipping.");
    return;
  }

  const publicDir = join(root, "public");
  await mkdir(publicDir, { recursive: true });
  const dest = join(publicDir, "pdf.worker.min.mjs");
  await copyFile(workerPath, dest);
  console.log("[setup-pdf-worker] Copied pdf.js worker -> public/pdf.worker.min.mjs");
}

main().catch((error) => {
  console.warn("[setup-pdf-worker] Failed to vendor pdf.js worker:", error.message);
});
