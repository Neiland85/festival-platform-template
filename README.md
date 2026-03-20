# Festival Platform Template

A **white-label festival platform** for ticket sales, lead capture, and event operations. Built with Next.js 16, React 19, TypeScript 5, Tailwind 4, PostgreSQL, and Vercel.

> Fork this template, customize branding and events, and deploy your own festival website in minutes.

---

## Features

- **Event lineup** with detail pages, ticket integration (Stripe / Ticketmaster / Universe), and OG metadata
- **Lead capture** with GDPR/RGPD compliance (consent flow, soft-delete, data portability)
- **Admin dashboard** with leads management, event CRUD, orders panel, system health, and observability
- **Internationalization** (i18n) with `next-intl` (ES/EN out of the box)
- **Sanity CMS** (optional) for managing events, artists, and site config with localized fields
- **Stripe Checkout** (optional) for ticket sales with capacity validation and order management
- **Meta Pixel** integration (conditional on cookie consent)
- **SEO** monitoring, sitemap, robots.txt, Open Graph
- **Security** middleware: CORS, rate limiting, circuit breaker, burst queue, CSRF
- **Observability** suite: metrics, tracing, audit log, surge prediction, pool monitoring
- **Load testing** with k6 (smoke, load, stress profiles)
- **Cookie banner** with accept/reject (GDPR compliant)
- **Golden Hour theme** with smooth CSS variable transitions

### Graceful Degradation

Every optional feature works independently. The template runs with **zero external services**:

| Feature | Configured | Not configured |
|---------|-----------|----------------|
| **Sanity CMS** | Events from CMS with localized fields | Falls back to `src/config/events.ts` |
| **Stripe** | "Buy Ticket" button with checkout | Falls back to Ticketmaster/Universe links |
| **PostgreSQL** | Full CRUD, orders, leads | Falls back to config file |
| **Sentry** | Error tracking + performance | Silent (no errors) |
| **Redis** | Distributed rate limiting | In-memory rate limiting |
| **Analytics** | GA + Meta Pixel (after cookie consent) | No tracking |

---

## Quick Start

**Prerequisites:** Node 20+, pnpm, Docker.

```bash
git clone <your-repo-url>
cd festival-platform-template
pnpm install
pnpm setup      # ~30 seconds — see below
pnpm dev        # http://localhost:3000
```

That's it. The admin dashboard is at `/dashboard` (password: `ADMIN_PASSWORD` from `.env.local`, default: `admin123`).

> **Note:** Dashboard login uses the `ADMIN_PASSWORD` environment variable, not the seeded users in the database. The `users` table is used for RBAC and audit trails.

### What `pnpm setup` does

1. Copies `.env.example` to `.env.local` (skips if it already exists)
2. Starts a PostgreSQL 15 container via Docker Compose
3. Waits for the database to report healthy
4. Pushes the Drizzle schema to the database
5. Seeds 7 demo events, 3 users, 8 leads, and 10 orders

To redo everything from scratch: `docker compose down -v && pnpm setup`

---

## White-Label Customization

### 1. Branding

All branding is centralized in `src/config/site.ts` and environment variables:

| What to change | Where |
|---------------|-------|
| Festival name | `NEXT_PUBLIC_SITE_NAME` in `.env.local` |
| Site URL | `NEXT_PUBLIC_SITE_URL` in `.env.local` |
| Tagline | `NEXT_PUBLIC_SITE_TAGLINE` in `.env.local` |
| Logo | Replace `/public/festival_logo.png` |
| Hero video | Replace `/public/hero/hero.mp4` |
| OG image | Replace `/public/og-image.jpg` |
| Color palette | CSS variables in `src/app/globals.css` |
| Social links | `NEXT_PUBLIC_SOCIAL_*` in `.env.local` |

### 2. Events

- Edit `src/config/events.ts` to add your festival lineup
- Or configure Sanity CMS and manage events at `/studio`
- Update ticket URLs with your Ticketmaster/Universe links
- To enable Stripe checkout, set `price_cents` on events (via DB or Sanity)

### 3. Content & Translations

- Update `messages/es.json` and `messages/en.json` with your copy
- Customize pages under `src/app/[locale]/` (contact, privacy, location)

### 4. Payment Provider Chain

The ticket widget uses a priority chain:

1. **Stripe** — Event has `price_cents` + `STRIPE_SECRET_KEY` configured
2. **Ticketmaster/Universe** — Event has `ticketUrl`
3. **Coming soon** — Neither configured

### 5. Domain & SEO

- Update `NEXT_PUBLIC_SITE_URL` in `.env.local`
- `src/app/robots.ts` and `src/app/sitemap.ts` read from this env var
- CORS origins in `src/middleware.ts` use this env var

---

## Environment Variables

See `.env.example` for the complete reference with inline documentation.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Admin dashboard password |
| `SESSION_SECRET` | Secret for admin session tokens (`openssl rand -hex 32`) |

### Branding

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Production URL (default: `https://www.your-festival.com`) |
| `NEXT_PUBLIC_SITE_NAME` | Festival name (default: `Festival Name`) |
| `NEXT_PUBLIC_SITE_TAGLINE` | Short tagline for hero and meta |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact email address |
| `NEXT_PUBLIC_SOCIAL_*` | Social media profile URLs |

### Optional Services

| Variable | Service | What it enables |
|----------|---------|----------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity CMS | CMS-driven content at `/studio` |
| `STRIPE_SECRET_KEY` | Stripe | Native ticket checkout |
| `SENTRY_DSN` | Sentry | Error tracking + performance |
| `REDIS_URL` | Redis | Distributed rate limiting |
| `TM_API_KEY` | Ticketmaster | Embedded ticket widgets |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | Traffic analytics |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Meta Pixel | Marketing tracking |

---

## Project Structure

```
src/
├── adapters/
│   ├── cms/              # Sanity CMS client, queries, image helper
│   ├── db/               # PostgreSQL repositories (events, leads, orders)
│   └── payments/stripe/  # Stripe client, checkout, webhook handler
├── app/                  # Next.js App Router (pages + API routes)
│   ├── [locale]/         # i18n routes (ES/EN)
│   ├── api/v1/           # Public API (events, leads, checkout, webhooks)
│   ├── api/admin/        # Admin API (metrics, orders, forecast)
│   ├── dashboard/        # Admin dashboard (events, leads, orders)
│   └── studio/           # Sanity Studio (embedded CMS)
├── config/
│   ├── site.ts           # Central white-label configuration
│   ├── events.ts         # Fallback event data
│   ├── navigation.ts     # Navigation menu
│   └── footer.ts         # Footer content
├── contracts/schemas/    # Zod validation schemas
├── domain/
│   ├── events/           # Event domain types
│   ├── leads/            # Lead creation logic
│   └── orders/           # Order creation, completion, capacity validation
├── i18n/                 # Internationalization routing + config
├── lib/
│   ├── auth/             # Authentication + RBAC
│   ├── observability/    # Metrics, audit log, tracing, SEO monitor
│   └── security/         # Rate limiting, CSRF, circuit breaker
└── ui/components/        # React components (public + dashboard)

k6/                       # Load testing scripts
├── config.js             # Shared config, thresholds, stage profiles
├── homepage.js           # Homepage load test
├── api-health.js         # Health probe stress test
├── lead-submission.js    # Lead capture under load
├── checkout-flow.js      # Checkout API under load
├── concurrent-users.js   # Mixed traffic ramp (100→500→1000 VUs)
└── run-all.sh            # Run all tests + JSON report

migrations/               # PostgreSQL migrations (run in order)
messages/                 # i18n translation files (ES/EN)
e2e/                      # Playwright E2E tests
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm setup` | One-command bootstrap (env + Docker + schema + seed) |
| `pnpm dev` | Development server |
| `pnpm dev:full` | `setup` + `dev` in one command |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm db:seed` | Re-run demo data seed (idempotent) |
| `pnpm db:push` | Push Drizzle schema to database |
| `pnpm db:studio` | Open Drizzle Studio (DB browser) |
| `pnpm lint` | ESLint (zero warnings) |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm test` | Unit tests (Vitest, 429+ tests) |
| `pnpm test:e2e` | E2E tests (Playwright, 7 specs) |
| `pnpm verify` | lint + typecheck + test + build |
| `pnpm format` | Prettier |

---

## Load Testing (k6)

The `k6/` directory contains performance tests with three profiles:

| Profile | VUs | Duration | Use case |
|---------|-----|----------|----------|
| `smoke` | 5-10 | ~1 min | Quick sanity check |
| `load` | 20-100 | ~5 min | Sustained traffic |
| `stress` | 100-1000 | ~10 min | Find breaking points |

### Run individual tests

```bash
# Install k6: brew install k6 (macOS) or snap install k6 (Linux)

# Against local dev server
k6 run k6/homepage.js

# Against staging
k6 run -e BASE_URL=https://staging.example.com k6/api-health.js

# Smoke test
k6 run -e PROFILE=smoke k6/concurrent-users.js
```

### Run all tests

```bash
# Default profile (load) against localhost
./k6/run-all.sh

# Against staging with stress profile
PROFILE=stress ./k6/run-all.sh https://staging.example.com
```

### SLO Thresholds

All tests enforce these thresholds (configurable in `k6/config.js`):

- **p95 response time < 500ms**
- **p99 response time < 1500ms**
- **Error rate < 1%**

Results are saved to `k6/results/` as JSON summaries.

---

## CI/CD

GitHub Actions runs on every PR and push to main:

1. `pnpm audit --prod --audit-level=high` — Security audit
2. `pnpm lint` — ESLint (zero warnings)
3. `pnpm typecheck` — TypeScript strict
4. `pnpm test` — Vitest unit tests
5. `pnpm build` — Next.js production build

Deploy automatically on Vercel when merging to `main`.

---

## Stripe Webhook Setup

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/v1/webhooks/stripe`
3. Listen for events: `checkout.session.completed`, `checkout.session.expired`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Sanity CMS Setup

1. Create a project at [sanity.io/manage](https://www.sanity.io/manage)
2. Set `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` in `.env.local`
3. Generate an API token with write access and set `SANITY_API_TOKEN`
4. Access the embedded studio at `/studio` (requires admin login)
5. Optional: Set up a webhook for ISR revalidation pointing to `/api/v1/revalidate`

---

## Troubleshooting

**Port 5432 already in use** — Another PostgreSQL instance is running. Stop it (`brew services stop postgresql` on macOS) or change the port in `docker-compose.yml` and `DATABASE_URL`.

**`pnpm setup` fails at "Waiting for PostgreSQL"** — Docker may not be running. Start Docker Desktop (or `systemctl start docker` on Linux) and retry.

**`db:push` fails with connection refused** — The container started but PostgreSQL isn't ready yet. Wait a few seconds and run `pnpm db:push` manually. If it persists, check `docker compose logs postgres`.

**Want a clean slate?** — Run `docker compose down -v && pnpm setup`. The `-v` flag deletes the persistent volume.

---

## License

MIT -- see [LICENSE](./LICENSE)
