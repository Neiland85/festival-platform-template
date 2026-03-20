// Test setup — imported by vitest via setupFiles
//
// Inject required env vars so that src/lib/env.ts Zod validation
// doesn't crash during test module imports. These are test-only
// dummy values — never used against real services.
process.env["DATABASE_URL"] ??= "postgres://test:test@localhost:5432/test"
process.env["SESSION_SECRET"] ??= "test-session-secret-must-be-at-least-32-characters-long"
process.env["ADMIN_PASSWORD"] ??= "test-admin-password"

export {}

// Extend vitest matchers with jest-dom (toBeInTheDocument, toHaveTextContent, etc.)
// Only loads when @testing-library/jest-dom is installed
try {
  await import("@testing-library/jest-dom/vitest")
} catch {
  // @testing-library/jest-dom not installed yet — skip silently
}
