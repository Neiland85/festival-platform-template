# Festival Platform Template

A **white-label festival platform** for ticket sales, lead capture, and event operations. Built with Next.js 16, React 19, TypeScript 5, Tailwind 4, PostgreSQL, and Vercel.

> Fork this template, customize branding and events, and deploy your own festival website.

---

## Features

- **Event lineup** with detail pages, ticket integration (Ticketmaster / Universe), and OG metadata
- **Lead capture** with GDPR/RGPD compliance (consent flow, soft-delete, data portability)
- **Admin dashboard** with leads management, event CRUD, system health, and observability
- **Internationalization** (i18n) with `next-intl` (ES/EN out of the box)
- **Meta Pixel** integration (conditional on cookie consent)
- **SEO** monitoring, sitemap, robots.txt, Open Graph
- **Security** middleware: CORS, rate limiting, circuit breaker, burst queue, CSRF
- **Observability** suite: metrics, tracing, audit log, surge prediction, pool monitoring
- **Cookie banner** with accept/reject (GDPR compliant)
- **Golden Hour theme** with smooth CSS variable transitions

---

## Quick Start

```bash
git clone <your-repo-url>
cd festival-platform-template
cp .env.example .env.local   # fill in your credentials
pnpm install
pnpm dev
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Your production URL (e.g. `https://www.your-festival.com`) |
| `NEXT_PUBLIC_SITE_NAME` | Yes | Your festival name (used in metadata and UI) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Admin dashboard password |
| `SESSION_SECRET` | Recommended | Secret for signing admin session tokens |
| `NEXT_PUBLIC_FB_PIXEL_ID` | No | Meta Pixel ID for marketing tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error monitoring |
| `SENTRY_DSN` | No | Sentry DSN for server-side monitoring |

---

## Customization Guide

### 1. Branding

- Replace `/public/festival_logo.png` and `/public/festival_logo_burst.png` with your festival logo
- Replace `/public/og-image.jpg` with your Open Graph image
- Replace `/public/hero/hero.mp4` with your hero video
- Update CSS variables in `src/app/globals.css` (colors, fonts)
- Update `NEXT_PUBLIC_SITE_NAME` env var

### 2. Events

- Edit `src/config/events.ts` to add your festival events
- Update ticket URLs with your Ticketmaster/Universe links
- Add event images to `/public/`

### 3. Content

- Update translation files in `messages/es.json` and `messages/en.json`
- Customize contact page (`src/app/contacto/page.tsx`)
- Customize privacy policy (`src/app/privacidad/page.tsx`)
- Customize location page (`src/app/ubicacion/page.tsx`)

### 4. Social Media

- Update social links in `src/ui/components/Footer.tsx`

### 5. CORS / Allowed Origins

- Update `ALLOWED_ORIGINS` in `src/middleware.ts` with your domain

### 6. SEO

- Update `src/app/robots.ts` and `src/app/sitemap.ts` with your domain
- Update `src/app/api/admin/seo/route.ts` BASE_URL

---

## Project Structure

```
src/
├── adapters/db/       # PostgreSQL repositories
├── app/               # Next.js App Router (pages + API routes)
├── config/            # Event configuration and constants
├── contracts/schemas/ # JSON Schema validation
├── domain/            # Pure business logic (leads, events)
├── i18n/              # Internationalization routing
├── lib/
│   ├── auth/          # Authentication + RBAC
│   ├── observability/ # Metrics, audit log, tracing, SEO
│   └── security/      # Rate limiting, CSRF, circuit breaker
└── ui/components/     # React components (public + dashboard)
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm lint` | ESLint (zero warnings) |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright) |
| `pnpm verify` | lint + typecheck + test + build |
| `pnpm format` | Prettier |

---

## CI/CD

GitHub Actions runs on every PR and push to main:
1. `pnpm audit --prod --audit-level=moderate`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

Deploy automatically on Vercel when merging to `main`.

---

## License

MIT -- see [LICENSE](./LICENSE)
