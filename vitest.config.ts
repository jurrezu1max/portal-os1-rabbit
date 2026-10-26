import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/engine/**/*.ts",
        "src/state/**/*.ts",
        "src/portal/**/*.{ts,tsx}",
        "src/icv/**/*.ts",
        "src/gsip/**/*.ts",
        "src/markets/**/*.ts",
        "src/pmd/**/*.ts",
        "src/compliance/**/*.ts",
        "src/agents/**/*.ts",
        "src/umbrella/**/*.ts",
        "src/mission/**/*.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
        "src/engine/{assistant,commands,graph}.ts": {
          perFile: true,
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 100,
        },
      },
    },
  },
});
