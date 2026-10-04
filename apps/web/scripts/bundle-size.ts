/**
 * Bundle budget gate: gzipped size of the JS and CSS the app ships
 * (dist/assets). Fails if any budget is exceeded. Run after `vite build`.
 * Budgets are recorded in docs/project-brief.md §6b — change both together.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGETS_KB = { js: 85, css: 4 } as const;

const assetsDir = join(import.meta.dirname, "..", "dist", "assets");
const totals = { js: 0, css: 0 };

for (const file of readdirSync(assetsDir)) {
  const kind = file.endsWith(".js")
    ? "js"
    : file.endsWith(".css")
      ? "css"
      : null;
  if (!kind) continue;
  const bytes = gzipSync(readFileSync(join(assetsDir, file)), {
    level: 9,
  }).length;
  totals[kind] += bytes;
  console.log(
    `  ${file.padEnd(48)} ${(bytes / 1024).toFixed(2).padStart(7)} KB gzip`,
  );
}

let failed = false;
for (const kind of ["js", "css"] as const) {
  const kb = totals[kind] / 1024;
  const budget = BUDGETS_KB[kind];
  const ok = kb <= budget;
  failed ||= !ok;
  console.log(
    `${ok ? "✓" : "✗"} ${kind.toUpperCase()} ${kb.toFixed(2)} KB / ${budget} KB gzip budget`,
  );
}
if (failed) process.exit(1);
