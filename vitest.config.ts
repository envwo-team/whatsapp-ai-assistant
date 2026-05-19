import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/entrypoints/popup/**", "src/styles/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "wxt/browser": resolve(__dirname, "tests/mocks/wxt-browser.ts"),
    },
  },
});
