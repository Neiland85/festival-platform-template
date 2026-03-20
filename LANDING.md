# Festival Platform Template

## Your festival website. Live this week. Not next quarter.

A production-ready Next.js template with ticket sales, admin dashboard, payments, and everything you'd spend 3 months building from scratch. Clone it, run one command, start selling tickets.

[Get the Platform →](#pricing) · [Live Demo →](#demo)

---

## You already know how this goes

You have a festival to promote. Tickets to sell. An audience waiting. But instead of launching, you're stuck in the weeds.

**Building payments from scratch.** Stripe docs, webhook signatures, idempotency, order states. A week disappears. It still has edge cases.

**Reinventing admin dashboards.** You need to see leads, orders, capacity. You wire up CRUD endpoints, tables, filters. Another two weeks. It looks terrible.

**Duct-taping security.** CSRF, rate limiting, CORS, cookie consent, GDPR. Each one feels like "just a few hours." Multiply by twelve.

**Fighting infrastructure.** Database migrations, connection pools, monitoring, CI/CD. None of this sells a single ticket, but skip it and production breaks at 2 AM.

You didn't start this project to become an infrastructure engineer. You started it to launch a festival.

---

## Skip the infrastructure. Ship the festival.

Festival Platform Template gives you everything between `git clone` and "tickets are selling" — already built, already tested, already working together.

You don't configure it. You don't assemble it from pieces. You run three commands:

```
pnpm install
pnpm setup
pnpm dev
```

Your local environment boots in 30 seconds. PostgreSQL, schema, demo data, admin dashboard — all running. Change the name, drop in your logo, connect Stripe if you want. Deploy.

The template handles the hard parts so you can focus on the only thing that matters: putting on a great event.

---

## What you get

### Ticket sales that actually work

Stripe Checkout integration with webhook verification, order tracking, capacity validation, and automatic sold-out detection. Or skip Stripe entirely and link to Ticketmaster or Universe — the template adapts.

### Admin dashboard from day one

See your leads, orders, system health, and capacity at a glance. Not a TODO comment in the codebase — a working dashboard with real-time data, behind auth, ready for your team.

### Security you didn't have to think about

11 security modules baked in. CSRF protection, rate limiting with Redis fallback, IP hashing, burst queue for traffic spikes, idempotency on critical paths, and overload protection. This isn't a checklist — it's running code with 998+ tests behind it.

### GDPR compliance built in

Cookie consent banner with accept/reject. Soft deletes on personal data. Full audit trail on every admin action: who, when, what, from where. IP hashing for analytics without exposing PII. Consent tracking per lead.

### Observability that scales

9 monitoring modules: request tracing, audit logs, connection pool monitoring, queue health alerts, SEO tracking, surge prediction, and a safety scorecard that grades your infrastructure across 8 dimensions. Compatible with CloudWatch, Loki, Datadog.

### i18n ready (ES/EN)

Full internationalization with next-intl. Spanish and English out of the box, with routing middleware. Add more languages by dropping a JSON file.

### Load-tested under pressure

6 k6 performance scripts covering homepage, API health, lead submission, checkout flow, and concurrent user ramps up to 1,000 virtual users. SLO thresholds enforced: p95 < 500ms, error rate < 1%.

### CI/CD pipeline included

GitHub Actions workflow: security audit, linting, type checking, unit tests, build verification, and Playwright E2E — all automated on every PR.

---

## Time to value

| Without this template | With this template |
|---|---|
| 2 weeks on payments | Stripe working in 10 minutes |
| 1 week on admin dashboard | Dashboard running at first boot |
| 1 week on security & GDPR | 11 security modules, zero config |
| 3 days on CI/CD | Pipeline runs on first push |
| 2 days on monitoring | 9 observability modules ready |
| **6-8 weeks** before first ticket sold | **First ticket sold this week** |

The setup script creates your database, pushes the schema, seeds demo data, and prints the URL. You're looking at a working festival platform before your coffee gets cold.

---

## Build it yourself vs. use the template

You could build all of this from scratch. Here's what that looks like.

### Time

| Component | From scratch | With the template |
|---|---|---|
| Stripe checkout + webhooks + order tracking | 2 weeks | Already done |
| Admin dashboard with auth + RBAC | 2 weeks | Already done |
| CSRF, rate limiting, burst queue, overload protection | 1 week | Already done |
| GDPR: cookie consent, soft deletes, audit trail, IP hashing | 1 week | Already done |
| i18n with locale routing | 3 days | Already done |
| CI/CD pipeline + E2E tests | 3 days | Already done |
| Observability: tracing, pool monitoring, surge prediction | 4 days | Already done |
| Load testing scripts + SLO thresholds | 2 days | Already done |
| Docker setup, migrations, seed data | 1 day | Already done |
| **Total** | **~6-8 weeks** | **30 seconds** |

### Cost

A mid-level Next.js developer charges $50–$90/hr. At $75/hr average:

| | Build from scratch | Use the template |
|---|---|---|
| Developer hours | 240–320 hours | 0 |
| Developer cost | $18,000–$24,000 | $0 |
| Platform license | $0 | From $2,900 |
| **Total** | **$18,000–$24,000** | **From $2,900** |

That's 85% savings on the low end. And the $18K version doesn't include tests. Or load testing. Or GDPR compliance. Or observability. Those add another 2-3 weeks and $5K-$8K if you want them done right.

### Complexity

Building it yourself means making hundreds of decisions that have nothing to do with your festival: which auth library, how to structure Stripe webhooks, where to put rate limiting middleware, how to handle idempotency on double-clicks, what to do when Redis goes down, how to implement soft deletes without breaking queries.

Each decision is small. Together, they are months.

The template made those decisions already. They're tested. They work together. You move on.

### Risk

The dangerous part of building from scratch isn't the code you write — it's the code you forget to write.

The CSRF protection you skipped because "it's just an internal tool." The rate limiting you'll add "after launch." The connection pool monitoring that would have caught the leak before 10,000 users hit your checkout at the same time.

The template ships with 998+ tests, 11 security modules, and 6 load testing scripts because these things fail silently — until they don't.

### The real question

You can spend 6-8 weeks and $18K+ building infrastructure that doesn't sell a single ticket. Or you can invest a fraction of that, have the platform running in 30 seconds, and start selling tickets this week.

One of those options lets you focus on your festival. The other one makes you an unpaid infrastructure engineer.

[Skip the build. Get the platform →](#pricing)

---

## What builders are saying

> "I was quoting clients 6 weeks for a festival site. Now I deliver in 3 days and keep the margin. The security and GDPR stuff alone would have taken me a month."
> — **Marcos R.**, freelance developer, Madrid

> "We used it for a 12,000-person electronic music festival. The load testing scripts caught a connection pool issue before launch that would have killed us on ticket drop day."
> — **Laura & Team**, event production company, Barcelona

> "I'm not a backend person. I just wanted to sell tickets for my community events. The template got me from zero to accepting payments in an afternoon."
> — **Daniela K.**, community organizer

---

## The math on owning your platform

A festival with 2,000 attendees selling €40 tickets generates €80,000 in revenue.

| | Eventbrite | This template + Stripe |
|---|---|---|
| Platform fee | ~5% → **€4,000** | 0% → **€0** |
| Payment processing | Included in their fee | ~2.9% → €2,320 |
| **You keep** | **€76,000** | **€77,680** |
| **Difference** | | **+€1,680 per event** |

Three events and the template has paid for itself. Ten events and you've saved more than it would cost to build from scratch.

Scale it: a 10,000-person festival at €85/ticket is €850,000 in revenue. Eventbrite's 5% is **€42,500** — gone. Every year. With this template, that money stays in your account.

The question isn't whether you can afford the platform. It's how much you're losing every month you don't own it.

---

## Pricing

One-time payment. No subscriptions. No per-ticket commissions. No "contact sales" for Indie and Business.

### Indie — $2,900

For a single developer launching one festival.

- Full source code (128 production files, TypeScript)
- Stripe Checkout + admin dashboard + i18n (ES/EN)
- Docker Compose + one-command setup
- Complete documentation
- 1 developer, 1 project
- 12 months of updates

[Get Indie →](#checkout-indie)

### Business — $7,900

For teams and agencies building multiple festivals. **Most popular.**

Everything in Indie, plus:

- 354+ test cases (unit + integration) + 7 E2E specs (Playwright)
- 11 security modules (CSRF, rate limiting, idempotency, burst queue, overload, chaos testing)
- 9 observability modules (tracing, audit log, surge prediction, safety scorecard)
- 7 load testing scripts (k6) with SLO thresholds
- CI/CD pipeline (GitHub Actions)
- Full GDPR compliance kit (consent, soft deletes, audit trail, IP hashing)
- Up to 5 developers, unlimited projects, client work included
- 12 months of updates + early access

[Get Business →](#checkout-business)

### Enterprise — $18,000

For event companies that need support and onboarding.

Everything in Business, plus:

- Unlimited developers
- 60-minute onboarding call with the creator
- Priority email support (72h SLA, 12 months)
- 2 code reviews of your customizations
- Private roadmap access + priority feature requests
- Custom license agreement for procurement

[Contact us →](#contact)

---

### Why one-time instead of SaaS?

Eventbrite charges $3,600–$50,000/year plus per-ticket commissions. Eventcube charges $3,600–$12,000/year. InEvent charges $15,000–$50,000/year. Every year.

You pay once. You own the code. You keep 100% of ticket revenue (minus Stripe's 2.9% processing fee). Year two costs you $0.

---

## FAQ

**Do I need to be a backend expert to use this?**
No. If you can run `pnpm install` and edit a `.env` file, you can get this running. The setup script handles Docker, database, schema, and seed data in one command. You don't touch SQL, you don't configure nginx, you don't debug connection pools. That's already done. Where you do need to be comfortable: reading React components and editing TypeScript files to customize your festival's pages and content. This is a developer template, not a no-code tool.

**Can I use it without Stripe?**
Yes. Stripe is one of three ticket modes, and all three work without code changes. If Stripe keys are configured and an event has a price, visitors get native checkout. If not, the template falls back to your Ticketmaster or Universe link. If neither exists, it shows "Coming soon." You can start without Stripe, sell via external links, and add Stripe later when you're ready to own the checkout flow. The switch is automatic.

**What if I don't want to run PostgreSQL?**
The template includes a Docker Compose file that starts PostgreSQL with one command — you don't install anything on your machine. For local dev, `pnpm setup` handles everything. For production, any managed Postgres works: Supabase, Neon, Railway, RDS. If you don't configure a database at all, the site still runs using a static config file for events. But leads, orders, and the admin dashboard need a database. That's where the value is.

**Can I modify the code?**
It's your code. You get the full source — 155 TypeScript files, not an obfuscated package. Change anything: components, API routes, database schema, business logic, styling. The codebase uses standard patterns (repository pattern, Zod validation, Drizzle ORM) so your team can read it without a decoder ring. The 998+ tests are there so you can refactor with confidence, not because you need permission.

**Is this actually production-ready or just a "starter kit"?**
This is not a TODO-list with nice folder names. Specific things that ship: 11 security modules (CSRF, rate limiting, idempotency, burst queue, overload protection, IP hashing), GDPR compliance (cookie consent, soft deletes, audit trail), 9 observability modules (request tracing, pool monitoring, surge prediction, safety scorecard), 6 load test scripts with SLO thresholds (p95 < 500ms, error rate < 1%), and a CI/CD pipeline that runs security audit, linting, type checking, unit tests, and E2E on every PR. If that sounds like what you'd build given 2-3 months and unlimited patience — that's the point.

**Can I use it for client projects?**
Yes. Pro and Agency licenses allow unlimited client projects. Build festival sites for clients, charge them whatever you want, keep the margin. You can't redistribute the template itself as a template (that would make you our competitor), but you can ship it as part of any finished product or client delivery. No attribution required.

**How do I customize the branding?**
Environment variables control everything visible: festival name, tagline, logo, social links, contact email, venue name. One config file (`src/config/site.ts`) handles the rest. Colors are CSS variables in one file. You don't search through 40 components replacing hardcoded strings. Change six env vars and it's your brand.

**What about hosting and deployment?**
The template is optimized for Vercel — push to main and it deploys automatically. But it runs on any platform that supports Next.js: Railway, Fly.io, AWS Amplify, a $5 VPS with Docker. The CI/CD pipeline (GitHub Actions) works regardless of where you host. For the database, any managed PostgreSQL works: Supabase free tier for starting out, Neon for serverless, or RDS if you're on AWS.

**Is the code clean enough for a team?**
Strict TypeScript, no `any` types. Zod schemas validate every API input at runtime. Drizzle ORM as single source of truth for the database schema. Repository pattern isolates data access from business logic. ESLint with zero-warning policy. Prettier for formatting. 998+ tests. This is not code you'll be embarrassed to hand to a teammate or show in a code review.

**Do you offer support?**
Honestly: this is a template, not a managed service. You get comprehensive docs, a README with troubleshooting for every common issue, and access to GitHub Discussions where you can ask questions and see what others have solved. There's no ticketed support line. But consider this: the template has 998+ tests and a CI/CD pipeline that validates every change. Most "support requests" for templates are actually bug reports — and those are caught by the test suite before they reach you.

**What if I buy it and it doesn't work for my use case?**
If the template doesn't run as described within 14 days, you get a full refund. No forms, no justification, no "let us help you troubleshoot." If it runs but doesn't fit your specific needs — that's a harder question, and one you should answer before buying. Check the live demo, read the feature list, look at the codebase structure. This template solves a specific problem (festival platform with ticket sales) very well. If you need an e-commerce store or a SaaS dashboard, this isn't it.

---

## Is this for you?

**This is for you if:**

- You're a developer or technical founder who wants a festival platform running this week, not in two months
- You're an agency or freelancer delivering event websites to clients and want to 8x your effective rate
- You're an event organizer who wants to own your ticketing, keep your data, and stop paying per-ticket commissions
- You need production-grade infrastructure (security, GDPR, observability) but don't have the team or time to build it

**This is NOT for you if:**

- You want a visual template with no backend — this is a full-stack platform with PostgreSQL, API routes, and server logic
- You don't want to touch code — this is a developer tool, not a drag-and-drop builder
- You need a generic e-commerce store or SaaS dashboard — this solves one problem (festival ticketing) and solves it well
- You're looking for a free starter kit to learn Next.js — there are better resources for that

---

## Still building from scratch?

Every week you spend on infrastructure is a week you're not selling tickets, building your audience, or shipping the thing that actually matters.

The code is ready. The tests pass. The security is handled.

[Get the Platform →](#pricing)
