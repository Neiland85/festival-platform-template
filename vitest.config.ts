import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    reporters: ["default"],
    passWithNoTests: false,
    isolate: true,
    // Default environment is node; component tests opt-in via
    // @vitest-environment jsdom comment at top of file
    environment: "node",
    environmentMatchGlobs: [
      ["src/**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["src/test/setup.ts"],
  },
})
