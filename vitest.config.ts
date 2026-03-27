import { resolve } from "path"
import { readFileSync } from "fs"
import { defineConfig } from "vitest/config"

// Load .env.test into process.env BEFORE any test code runs.
// This ensures env.ts Zod validation succeeds in test workers.
const envTestPath = resolve(__dirname, ".env.test")
try {
  const envContent = readFileSync(envTestPath, "utf-8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    const val = trimmed.slice(eqIdx + 1)
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
} catch {
  // .env.test is optional
}

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      SESSION_SECRET: "test-secret-must-be-at-least-32-characters-long-for-validation",
      ADMIN_PASSWORD: "test-admin",
      CSRF_SECRET: "test-csrf-secret",
      IP_HASH_SALT: "test-ip-salt",
    },

    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", "e2e", ".next", "dist"],

    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/test/**",
        "src/types/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
