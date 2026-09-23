/**
 * Vitest config — runs unit tests against the services layer.
 * Uses Node env (no jsdom) for pure-logic tests.
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
    coverage: {
      reporter: ["text", "html"],
      include: ["src/services/**", "src/lib/**", "src/validators/**"],
    },
  },
});
