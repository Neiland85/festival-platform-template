# Contributing to Festival Platform Template

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 16+ (local or Neon)
- Git with GPG signing (recommended)

## Quick start

```bash
git clone https://github.com/Neiland85/festival-platform-template.git
cd festival-platform-template
pnpm setup                        # copies .env.example → .env.local, installs deps
pnpm dev                          # http://localhost:3000
```

If `pnpm setup` is not available or you prefer manual steps:

```bash
cp .env.example .env.local        # edit with your Neon connection string
pnpm install
pnpm exec drizzle-kit push        # push schema to local/dev database
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server (hot reload) |
| `pnpm build` | Production build |
| `pnpm verify` | Lint + typecheck + tests + build (run before push) |
| `pnpm lint` | ESLint with zero warnings tolerance |
| `pnpm typecheck` | TypeScript strict mode |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright + Chromium) |
| `pnpm test:e2e:ui` | E2E with interactive UI |
| `pnpm audit:prod` | Security audit (production deps, high severity) |
| `pnpm db:push` | Push schema to database (dev) |
| `pnpm db:migrate` | Run migrations (production) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Drizzle Studio (DB GUI) |

## Database setup

**Local development** — use Docker:

```bash
docker compose -f docker-compose.ci.yml up -d
# DATABASE_URL="postgres://ci:ci@localhost:5432/ci_e2e"
pnpm exec drizzle-kit push --force
```

**Neon** — create a branch for your feature:

```bash
neonctl branches create --project-id green-cloud-183924 --name dev/your-name
# Copy the connection string to .env.local
```

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with [semantic-release](https://github.com/semantic-release/semantic-release). Commits on `main` determine the next version automatically.

### Format

```
type(scope): description

[optional body]

[optional footer: BREAKING CHANGE: description]
```

### Types and version impact

| Type | Description | Version bump |
|------|-------------|--------------|
| `feat` | New feature | **minor** (0.1.0 → 0.2.0) |
| `fix` | Bug fix | **patch** (0.1.0 → 0.1.1) |
| `perf` | Performance improvement | **patch** |
| `security` | Security fix | **patch** |
| `docs` | Documentation only | none |
| `chore` | Maintenance, deps | none |
| `ci` | CI/CD changes | none |
| `refactor` | Code restructuring | none |
| `style` | Formatting, whitespace | none |
| `test` | Adding or fixing tests | none |
| `BREAKING CHANGE` | In footer or `!` after type | **major** (0.x → 1.0.0) |

### Examples

```bash
# Feature — triggers minor release
git commit -m "feat(hero): add image carousel with crossfade"

# Fix — triggers patch release
git commit -m "fix(auth): prevent session fixation on login"

# Breaking change — triggers major release
git commit -m "feat(api)!: change event response schema

BREAKING CHANGE: event.date is now event.startDate"

# No release
git commit -m "docs(readme): update deployment instructions"
git commit -m "chore(deps): bump next from 16.0 to 16.1"
git commit -m "ci(release): add semantic-release pipeline"
```

### Scopes (optional but recommended)

`hero`, `auth`, `db`, `api`, `ui`, `deps`, `ci`, `a11y`, `gdpr`, `sre`, `release`

## Branch naming

```
feat/short-description      # New features
fix/short-description       # Bug fixes
chore/short-description     # Maintenance
security/short-description  # Security fixes
```

Always branch from `main`. Always squash merge.

## Pull requests

1. Create a feature branch from `main`
2. Make changes following the conventions above
3. Run `pnpm verify` locally — **must pass**
4. Push and open a PR — the template will guide you
5. Request review (1 approval required)
6. Squash merge with a conventional commit message

### PR title format

The squash merge commit message **is** the PR title. Use conventional commit format:

```
feat(scope): what this PR does
fix(scope): what this PR fixes
```

## Testing

### Unit tests (Vitest)

```bash
pnpm test                    # run once
pnpm test:watch              # watch mode
```

Tests live next to the code they test (`*.test.ts`) or in `src/test/`.

### E2E tests (Playwright)

```bash
pnpm test:e2e                # headless
pnpm test:e2e:ui             # interactive UI
```

E2E tests are in `e2e/`. They require a running dev server (Playwright starts it automatically via `webServer` config).

### Test database

E2E tests use an ephemeral Postgres container. CI spins one up automatically. Locally:

```bash
docker compose -f docker-compose.ci.yml up -d
DATABASE_URL="postgres://ci:ci@localhost:5432/ci_e2e" pnpm exec drizzle-kit push --force
```

## Project structure

```
src/
├── adapters/db/       # PostgreSQL repositories (Drizzle ORM)
├── app/               # Next.js App Router (pages + API routes)
│   └── [locale]/      # i18n routes (ES/EN)
├── config/            # Site config, env exports
├── contracts/schemas/ # Zod validation schemas
├── domain/            # Pure business logic
├── lib/               # Cross-cutting utilities
│   ├── auth/          # Authentication + RBAC
│   ├── observability/ # Metrics, audit log, tracing
│   └── security/      # Rate limiting, CSRF, queue, idempotency
└── ui/components/     # React components (client + server)

e2e/                   # Playwright E2E tests
k6/                    # Load testing (k6)
observability/         # Prometheus alerts, Grafana dashboards
scripts/               # Automation scripts
```

## Security

- **Never** commit `.env`, credentials, tokens, or API keys
- Use `hashIp()` for any persisted IP address
- GDPR consent required before storing personal data
- SQL injection prevented by Drizzle ORM parameterized queries
- CSRF tokens on all mutation endpoints
- Rate limiting on public-facing endpoints
- Report vulnerabilities to the project maintainer — **do not open public issues**

## CI/CD

GitHub Actions runs on every PR:

1. Lint (`pnpm lint`)
2. Typecheck (`pnpm typecheck`)
3. Tests (`pnpm test`)
4. Audit (`pnpm audit --prod --audit-level=high`)
5. Build (`pnpm build`)
6. E2E (`pnpm test:e2e`)

On merge to `main`:

- semantic-release analyzes commits → creates tag + GitHub Release
- Vercel deploys automatically to production
