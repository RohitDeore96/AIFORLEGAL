/**
 * Vitest config — runs unit + integration + complexity + property tests.
 * Node env (no jsdom) for pure-logic tests.
 *
 * Coverage: reports on services/, lib/, validators/ — the critical
 * business logic. UI components are excluded (we trust shadcn/ui).
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Run tests in parallel for speed (each file in its own worker)
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/services/**",
        "src/lib/**",
        "src/validators/**",
      ],
      exclude: [
        "src/services/ai/factory.ts", // singleton, tested indirectly
        "src/services/storage/document-storage.ts", // FS-dependent, tested via integration tests
        "**/*.d.ts",
        "**/*.config.*",
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
