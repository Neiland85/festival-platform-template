# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GDPR-compliant privacy page with 10 sections (PR #28)
- Cookie consent E2E tests with Playwright (PR #28)
- Accessibility test suite with axe-core (PR #28)
- ACCESSIBILITY_CHECKLIST.md guide (PR #28)
- Neon preview branch lifecycle workflow (PR #28)
- SRE k6 load testing config with dynamic profiles (PR #24)
- Prometheus alert rules and Grafana dashboard (PR #24)
- CI database infrastructure with Docker Compose (PR #25)
- Database backup-before-migrate script (PR #25)
- Migration PR template with rollback checklist (PR #25)
- Hero image carousel replacing video hero (404 fix)

### Fixed
- Branch protection phantom checks (app_id: null → 15368)
- Footer copyright contrast ratio for WCAG 2 AA compliance
- pnpm-lock.yaml sync for @axe-core/playwright

### Changed
- Hero section: video crossfade → image crossfade (eliminates CDN dependency)
- CDN asset workflow migrated to ci-assets.yml (PR #20)
- Removed package-lock.json in favor of pnpm-lock.yaml (PR #21)

### Security
- CI secrets masking with ::add-mask:: on all sensitive env vars
- DATABASE_URL guard prevents drizzle-kit push against non-CI databases
- Audit logs scrub scans artifacts for leaked secrets before upload

## [0.1.0] — 2026-03-22

### Added
- Initial Next.js 16 festival platform with App Router
- Multi-locale support (ES/EN) via next-intl
- Drizzle ORM with Neon PostgreSQL
- Sanity CMS integration
- Tailwind CSS 4 styling
- Playwright E2E test infrastructure
- Vitest unit test setup
- CI pipeline (lint, typecheck, test, audit, build, E2E)
- Branch protection with required status checks
- Sentry error monitoring integration

<!--
  Entry format:

  ## [X.Y.Z] — YYYY-MM-DD

  ### Added       — new features
  ### Changed     — changes in existing functionality
  ### Deprecated  — soon-to-be removed features
  ### Removed     — now removed features
  ### Fixed       — bug fixes
  ### Security    — vulnerability fixes

  Each entry: `- Description of change (PR #N or commit ref)`

  Commit convention (Conventional Commits):
    feat:     → Added     (minor bump)
    fix:      → Fixed     (patch bump)
    perf:     → Changed   (patch bump)
    refactor: → Changed   (no bump)
    docs:     → Changed   (no bump)
    chore:    → Changed   (no bump)
    ci:       → Changed   (no bump)
    security: → Security  (patch bump)
    BREAKING CHANGE: → major bump
-->
