# Contributing to Festival Platform Template

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ (or Supabase)
- Redis (optional, for rate limiting and distributed queue)

## Local Setup

```bash
git clone <your-repo-url>
cd festival-platform-template
cp .env.example .env.local   # edit with your credentials
pnpm install
pnpm dev
```

## Main Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm verify` | Lint + typecheck + tests + build (pre-push) |
| `pnpm lint` | ESLint (zero warnings) |
| `pnpm typecheck` | TypeScript strict |
| `pnpm test` | Unit tests (vitest) |
| `pnpm test:e2e` | E2E tests (Playwright) |
| `pnpm audit:prod` | Security audit (prod deps) |

## Project Structure

```
src/
├── adapters/db/       # PostgreSQL repositories
├── app/               # Next.js App Router (pages + API routes)
├── contracts/schemas/ # JSON Schema for validation
├── domain/            # Pure business logic
├── lib/               # Cross-cutting utilities
│   ├── auth/          # Authentication + RBAC
│   ├── observability/ # Metrics, audit log, tracing
│   └── security/      # Rate limiting, CSRF, queue, idempotency
└── ui/components/     # React components
```

## Conventions

- **Commits**: English, imperative, concise. Example: `fix: prevent duplicate lead submissions via idempotency key`
- **Branches**: `feat/`, `fix/`, `chore/` from `main`
- **Tests**: every new module requires tests. Minimum coverage: exported functions
- **Lint**: `--max-warnings=0`. No merging with warnings

## Pre-push checks

The pre-push hook runs `pnpm verify`. If it fails, the push is blocked. Do not use `--no-verify`.

## Security

- Do not commit `.env`, credentials, or tokens
- Use `hashIp()` for any persisted IP
- GDPR consent required before storing personal data
- Report vulnerabilities via email to the project maintainer

## CI/CD

GitHub Actions runs on every PR and push to main:
1. `pnpm audit --prod --audit-level=moderate`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

Automatic deploy on Vercel when merging to `main`.
