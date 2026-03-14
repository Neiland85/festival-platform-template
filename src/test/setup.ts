// Test setup — imported by vitest via setupFiles
export {}

// Extend vitest matchers with jest-dom (toBeInTheDocument, toHaveTextContent, etc.)
// Only loads when @testing-library/jest-dom is installed
try {
  await import("@testing-library/jest-dom/vitest")
} catch {
  // @testing-library/jest-dom not installed yet — skip silently
}
