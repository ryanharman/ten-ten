import { defineConfig } from "vitest/config";

/**
 * Single test run across the workspace so coverage lands in one report,
 * which Fallow reads for accurate CRAP (complexity × untested) scores.
 */
export default defineConfig({
  test: {
    projects: [
      { test: { name: "core", root: "packages/core" } },
      { test: { name: "tokens", root: "packages/tokens" } },
      // Inline config: avoids loading apps/web/vite.config.ts (tests don't need its plugins).
      { test: { name: "web", root: "apps/web", environment: "happy-dom" } },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**", "apps/*/src/**"],
      exclude: [
        "**/*.test.*",
        "**/*.bench.*",
        "**/test-utils.ts",
        "**/main.tsx",
        "**/*.d.ts",
      ],
      reporter: ["text-summary", "json"],
    },
  },
});
