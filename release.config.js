/**
 * semantic-release configuration
 *
 * Runs on merge to main. Analyzes commits since last tag,
 * determines version bump, updates CHANGELOG.md, creates
 * GitHub release with notes.
 *
 * Commit convention: Conventional Commits
 *   feat:     → minor bump  (0.1.0 → 0.2.0)
 *   fix:      → patch bump  (0.1.0 → 0.1.1)
 *   perf:     → patch bump
 *   docs:     → no release
 *   chore:    → no release
 *   ci:       → no release
 *   refactor: → no release
 *   BREAKING CHANGE: → major bump (0.x → 1.0.0)
 *
 * Install:
 *   pnpm add -D semantic-release @semantic-release/changelog \
 *     @semantic-release/git @semantic-release/github
 */

/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  branches: ["main"],
  tagFormat: "v${version}",

  plugins: [
    // 1. Analyze commits to determine version bump
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "security", release: "patch" },
          { type: "revert", release: "patch" },
          // No release for: docs, chore, ci, refactor, style, test
        ],
      },
    ],

    // 2. Generate release notes from commits
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "Added", hidden: false },
            { type: "fix", section: "Fixed", hidden: false },
            { type: "perf", section: "Changed", hidden: false },
            { type: "security", section: "Security", hidden: false },
            { type: "revert", section: "Reverted", hidden: false },
            { type: "docs", section: "Documentation", hidden: true },
            { type: "chore", section: "Maintenance", hidden: true },
            { type: "ci", section: "CI/CD", hidden: true },
            { type: "refactor", section: "Changed", hidden: true },
            { type: "style", section: "Changed", hidden: true },
            { type: "test", section: "Tests", hidden: true },
          ],
        },
      },
    ],

    // 3. Update CHANGELOG.md
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
        changelogTitle: "# Changelog",
      },
    ],

    // 4. Bump version in package.json + commit CHANGELOG + package.json
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message:
          "chore(release): v${nextRelease.version}\n\n${nextRelease.notes}",
      },
    ],

    // 5. Create GitHub release with tag
    [
      "@semantic-release/github",
      {
        // Attach build artifacts here if needed
        // assets: [{ path: "dist/**", label: "Build" }],
      },
    ],
  ],
};
