import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Kept apart from vite.config.ts so tests don't run the TanStack router plugin
// (which rewrites src/routeTree.gen.ts) or the build-time env guard.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Pure logic runs in Node; files that need a DOM opt in with
    // `// @vitest-environment jsdom` at the top.
    environment: "node",
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
});
