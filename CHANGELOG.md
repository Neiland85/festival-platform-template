# Changelog

## [1.19.0](https://github.com/Neiland85/festival-platform-template/compare/v1.18.0...v1.19.0) (2026-03-31)

### Added

* alert suppression with cooldown, escalation, and incident tracking ([ccc2f48](https://github.com/Neiland85/festival-platform-template/commit/ccc2f484702164d6c20f90931d08be1a12ebf913))

## [1.18.0](https://github.com/Neiland85/festival-platform-template/compare/v1.17.0...v1.18.0) (2026-03-31)

### Added

* **dashboard:** redesign DLQ admin UX for operator efficiency ([0cb8f12](https://github.com/Neiland85/festival-platform-template/commit/0cb8f12110743a7eaad99ed4724c3ac238fe5588))

## [1.17.0](https://github.com/Neiland85/festival-platform-template/compare/v1.16.1...v1.17.0) (2026-03-31)

### Added

* DLQ reliability system — auto-retry, alerting, operator tooling ([53a4b10](https://github.com/Neiland85/festival-platform-template/commit/53a4b10147c84bfd8f55e3b280660ca86ed24636))

## [1.16.1](https://github.com/Neiland85/festival-platform-template/compare/v1.16.0...v1.16.1) (2026-03-27)

### Fixed

* **orders:** 3 critical safety fixes — transactions + status guards ([0b1488c](https://github.com/Neiland85/festival-platform-template/commit/0b1488c3708d04c0d927957ad21dd17f7a4c5889))

## [1.16.0](https://github.com/Neiland85/festival-platform-template/compare/v1.15.2...v1.16.0) (2026-03-27)

### Added

* **ux:** Clarity logo as spinning cursor + shockwave click effect ([660d3e1](https://github.com/Neiland85/festival-platform-template/commit/660d3e161b8cb469d234db26db78ab81bbcea040)), closes [#2563eb](https://github.com/Neiland85/festival-platform-template/issues/2563eb)

## [1.15.2](https://github.com/Neiland85/festival-platform-template/compare/v1.15.1...v1.15.2) (2026-03-27)

### Fixed

* **orders:** atomic capacity reservation — eliminates overselling race condition ([2d78660](https://github.com/Neiland85/festival-platform-template/commit/2d786608fce5c484390e682167f38b97a03a6971))

## [1.15.1](https://github.com/Neiland85/festival-platform-template/compare/v1.15.0...v1.15.1) (2026-03-27)

### Fixed

* move spinning logo to top-right corner, larger, with blend mode ([c413699](https://github.com/Neiland85/festival-platform-template/commit/c4136992cbe89e14e361796e9761f26d46a98167))

## [1.15.0](https://github.com/Neiland85/festival-platform-template/compare/v1.14.0...v1.15.0) (2026-03-27)

### Added

* landing page for non-developers + spinning logo cursor + shockwave click ([8d76815](https://github.com/Neiland85/festival-platform-template/commit/8d76815c0f3c1b23db291be635518cccd577154c))

## [1.14.0](https://github.com/Neiland85/festival-platform-template/compare/v1.13.0...v1.14.0) (2026-03-27)

### Added

* neobrutalism landing page — bold modern UX for product showcase ([52b1448](https://github.com/Neiland85/festival-platform-template/commit/52b1448054f04478537d8f2bed611a07280ec4c5)), closes [#FFFDF7](https://github.com/Neiland85/festival-platform-template/issues/FFFDF7)

## [1.13.0](https://github.com/Neiland85/festival-platform-template/compare/v1.12.0...v1.13.0) (2026-03-27)

### Added

* neobrutalism cookie banner — bold UX, animated gradient, modern design ([25e8a0d](https://github.com/Neiland85/festival-platform-template/commit/25e8a0dae36f2b4d7413f016139eb4a52f455a8d)), closes [#FFFDF7](https://github.com/Neiland85/festival-platform-template/issues/FFFDF7)

## [1.12.0](https://github.com/Neiland85/festival-platform-template/compare/v1.11.0...v1.12.0) (2026-03-27)

### Added

* premium glassmorphism cookie banner with RGPD/LSSI legal text ([6587e2e](https://github.com/Neiland85/festival-platform-template/commit/6587e2e90faca266597368d6890c8d3209510e85))

## [1.11.0](https://github.com/Neiland85/festival-platform-template/compare/v1.10.6...v1.11.0) (2026-03-27)

### Added

* GDPR cookie banner on all public pages ([54d532b](https://github.com/Neiland85/festival-platform-template/commit/54d532b3b6323382baa1b235fe7ee558360543a6))

## [1.10.6](https://github.com/Neiland85/festival-platform-template/compare/v1.10.5...v1.10.6) (2026-03-27)

### Fixed

* homepage is the product landing page, not a festival demo ([7254ae2](https://github.com/Neiland85/festival-platform-template/commit/7254ae21905de6c337c31dc931863b393bd2ed45))

## [1.10.5](https://github.com/Neiland85/festival-platform-template/compare/v1.10.4...v1.10.5) (2026-03-27)

### Fixed

* use correct event IDs in translations (chambao, bresh, ohsee, goa, tropicalia, tecnoflamenco) ([4e69a75](https://github.com/Neiland85/festival-platform-template/commit/4e69a7568f0d31d65a7626e084e5dfd345804673)), closes [#418](https://github.com/Neiland85/festival-platform-template/issues/418)

## [1.10.4](https://github.com/Neiland85/festival-platform-template/compare/v1.10.3...v1.10.4) (2026-03-27)

### Fixed

* return empty object instead of throwing in serverEnv browser Proxy ([242d7f3](https://github.com/Neiland85/festival-platform-template/commit/242d7f3cd2f6ebd4f947fd88d7309dcdc44ca331))

## [1.10.3](https://github.com/Neiland85/festival-platform-template/compare/v1.10.2...v1.10.3) (2026-03-27)

### Fixed

* **critical:** prevent serverEnv from crashing browser hydration ([f42c001](https://github.com/Neiland85/festival-platform-template/commit/f42c001208fa2e0336121a497666354595267f70))

## [1.10.2](https://github.com/Neiland85/festival-platform-template/compare/v1.10.1...v1.10.2) (2026-03-27)

### Fixed

* add missing i18n translations (runtime crash fix) ([#52](https://github.com/Neiland85/festival-platform-template/issues/52)) ([8d22dd4](https://github.com/Neiland85/festival-platform-template/commit/8d22dd4fd7c688f1de9aad137ec2bf279330fb31))

## [1.10.1](https://github.com/Neiland85/festival-platform-template/compare/v1.10.0...v1.10.1) (2026-03-27)

### Fixed

* resolve middleware Edge Runtime crash + assemble landing page ([#51](https://github.com/Neiland85/festival-platform-template/issues/51)) ([5584d86](https://github.com/Neiland85/festival-platform-template/commit/5584d863714e65ccd7ef52db1f93da1af91745a3))

## [1.10.0](https://github.com/Neiland85/festival-platform-template/compare/v1.9.0...v1.10.0) (2026-03-27)

### Added

* Clarity Structures showcase landing page at /showcase ([#50](https://github.com/Neiland85/festival-platform-template/issues/50)) ([4d5f2fe](https://github.com/Neiland85/festival-platform-template/commit/4d5f2fea8a0a0e8a05eebaf31f16d1cedcf3c50b))

## [1.9.0](https://github.com/Neiland85/festival-platform-template/compare/v1.8.0...v1.9.0) (2026-03-27)

### Added

* **security:** WAF + 2FA TOTP + AES-256-GCM + Audit Plan ([#48](https://github.com/Neiland85/festival-platform-template/issues/48)) ([81b792b](https://github.com/Neiland85/festival-platform-template/commit/81b792bf006a623d1774a0909486acc5b233862e))

## [1.8.0](https://github.com/Neiland85/festival-platform-template/compare/v1.7.0...v1.8.0) (2026-03-27)

### Added

* **security:** 2FA TOTP + AES-256-GCM encryption + official audit plan ([#47](https://github.com/Neiland85/festival-platform-template/issues/47)) ([d0bfcdc](https://github.com/Neiland85/festival-platform-template/commit/d0bfcdcee56eec8fd9e2c733ce234ffbae158d08))

## [1.7.0](https://github.com/Neiland85/festival-platform-template/compare/v1.6.0...v1.7.0) (2026-03-27)

### Added

* **security:** Web Application Firewall (WAF) — deep packet inspection for 8 attack categories ([#46](https://github.com/Neiland85/festival-platform-template/issues/46)) ([d79b753](https://github.com/Neiland85/festival-platform-template/commit/d79b75356e47be7ac0c35ec47f4658c82a9f56b1))

## [1.6.0](https://github.com/Neiland85/festival-platform-template/compare/v1.5.0...v1.6.0) (2026-03-27)

### Added

* **security:** ransomware defense — supply chain hardening, integrity monitor, incident response ([#45](https://github.com/Neiland85/festival-platform-template/issues/45)) ([c4698ef](https://github.com/Neiland85/festival-platform-template/commit/c4698ef8a94a37d374a9e80ef6a69cc84745f5e3))

## [1.5.0](https://github.com/Neiland85/festival-platform-template/compare/v1.4.0...v1.5.0) (2026-03-27)

### Added

* **security:** VPN-grade privacy protections — anti-fingerprint, COOP/CORP, metadata stripping ([#43](https://github.com/Neiland85/festival-platform-template/issues/43)) ([4eec91d](https://github.com/Neiland85/festival-platform-template/commit/4eec91d81e92024ba550c265cc15a6051b3e285e))

## [1.4.0](https://github.com/Neiland85/festival-platform-template/compare/v1.3.1...v1.4.0) (2026-03-27)

### Added

* **security:** DDoS Shield — multi-layer defense against volumetric & application-layer attacks ([#42](https://github.com/Neiland85/festival-platform-template/issues/42)) ([77a4701](https://github.com/Neiland85/festival-platform-template/commit/77a4701fcb1e955d4922d5bae90070adbf82fad1))

## [1.3.1](https://github.com/Neiland85/festival-platform-template/compare/v1.3.0...v1.3.1) (2026-03-27)

### Fixed

* **security:** remediate 9 vulnerabilities from ethical hacking assessment ([#41](https://github.com/Neiland85/festival-platform-template/issues/41)) ([a788687](https://github.com/Neiland85/festival-platform-template/commit/a7886872b94ef41a0ac8337ed4df0b65e2069fb9))

## [1.3.0](https://github.com/Neiland85/festival-platform-template/compare/v1.2.0...v1.3.0) (2026-03-27)

### Added

* **audit:** DLQ, OpenAPI, OpenTelemetry, Codecov, E2E tests, multi-tenancy ([#40](https://github.com/Neiland85/festival-platform-template/issues/40)) ([a7d7b03](https://github.com/Neiland85/festival-platform-template/commit/a7d7b037f842028199b7b5bd081eee39d358eb47))

## [1.2.0](https://github.com/Neiland85/festival-platform-template/compare/v1.1.0...v1.2.0) (2026-03-27)

### Added

* **audit:** implement persistent audit log with PostgreSQL ([#39](https://github.com/Neiland85/festival-platform-template/issues/39)) ([76224ab](https://github.com/Neiland85/festival-platform-template/commit/76224ab116908fbc8744b915d4e78327cadf31c3))

## [1.1.0](https://github.com/Neiland85/festival-platform-template/compare/v1.0.1...v1.1.0) (2026-03-27)

### Added

* **audit:** implement persistent audit log with PostgreSQL ([#38](https://github.com/Neiland85/festival-platform-template/issues/38)) ([2c11e72](https://github.com/Neiland85/festival-platform-template/commit/2c11e72e09105720009cb369b3eb3953fa0b0b78))

## [1.0.1](https://github.com/Neiland85/festival-platform-template/compare/v1.0.0...v1.0.1) (2026-03-27)

### Fixed

* update pnpm-lock.yaml after semantic-release v1.0.0 ([fa1bdc9](https://github.com/Neiland85/festival-platform-template/commit/fa1bdc9c689e81881857cb6a1399963ff8d18fba))

## 1.0.0 (2026-03-27)

### ⚠ BREAKING CHANGES

* Complete domain pivot from festival management to
SaaS template marketplace.

Removed:
- Domain: events, orders, leads (all domain logic + tests)
- Adapters: Stripe payments, Sanity CMS client, event/order repos
- APIs: /api/v1/events, /api/v1/leads, /api/v1/checkout, /api/v1/webhooks
- Pages: /eventos, /checkout, dashboard/{events,leads,orders}
- Components: EventCard, EventosGrid, StripeCheckout, TicketmasterWidget,
  FestivalThemeProvider, all festival-specific dashboard cards
- Migrations: all 6 SQL migration files
- Schemas: event.schema, lead.schema + contract tests

Added:
- Domain: src/domain/assets/ (types, create-asset, run-verification + tests)
- APIs: /api/catalog (GET/POST), /api/catalog/[slug], /api/verification/run
- Schema: asset.schema.ts (Zod validation)
- 12 new tests for asset domain

Kept (infrastructure):
- Auth, CSRF, rate limiting, Redis, queue facade, middleware
- CI pipeline, Vitest, Playwright, k6 configs
- i18n framework, white-label config, theme system
- DB connection pool and Drizzle config

354 tests passing, build clean.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

### Added

* add blur-to-reveal mist effect and ripple burst to event cards ([09c0e59](https://github.com/Neiland85/festival-platform-template/commit/09c0e59f840f8d30853af813ff34ad63d0ab4852))
* add concert programming section to landing page ([59b8020](https://github.com/Neiland85/festival-platform-template/commit/59b8020bca63706d780111d38e169f265abf5274)), closes [#programacion](https://github.com/Neiland85/festival-platform-template/issues/programacion)
* add i18n (ES/EN) with next-intl + complete white-label cleanup ([199f38e](https://github.com/Neiland85/festival-platform-template/commit/199f38ec55d9aa8da90c0290c6da90e5383147c7))
* add Sanity CMS integration with graceful degradation ([8936ffe](https://github.com/Neiland85/festival-platform-template/commit/8936ffe7cfeb54ec2f487d0005796a4636456d08))
* add Stripe Checkout, k6 load testing, and white-label polish (Weeks 3-4) ([620e32c](https://github.com/Neiland85/festival-platform-template/commit/620e32c600555a0254622a1523d9d7ea8e2164e3))
* centralized Zod env validation — fail-fast on boot, typed access ([a929f03](https://github.com/Neiland85/festival-platform-template/commit/a929f03bd9ad32be36328bbbf04a6e10e81d3fdc))
* close P1 audit gaps — CSRF/rate-limit on checkout, E2E in CI, ADRs ([c96b1b2](https://github.com/Neiland85/festival-platform-template/commit/c96b1b2ebb95faead8363d4ebbeccc920ba2cb84))
* **compliance:** GDPR privacy, cookie E2E, accessibility suite ([#28](https://github.com/Neiland85/festival-platform-template/issues/28)) ([2fba9cb](https://github.com/Neiland85/festival-platform-template/commit/2fba9cb2fd1202455b3a76dc36494ac920d9d2ea)), closes [#858585](https://github.com/Neiland85/festival-platform-template/issues/858585) [#ffffff](https://github.com/Neiland85/festival-platform-template/issues/ffffff)
* Enterprise contact flow + pricing section + checkout integration ([62b6814](https://github.com/Neiland85/festival-platform-template/commit/62b6814102033da27c7b05ebf9ae0fcd77c077c1)), closes [#pricing](https://github.com/Neiland85/festival-platform-template/issues/pricing)
* **hero:** dual-video background with crossfade, parallax, Ticketmaster CTA ([cf404fb](https://github.com/Neiland85/festival-platform-template/commit/cf404fb22c673efe7ea3f779574fa2d9ed343f83))
* **hero:** replace video hero with image carousel crossfade ([dfcf903](https://github.com/Neiland85/festival-platform-template/commit/dfcf9034f4587a7104a296a9f2187d3d7d1abd4c))
* **infra:** CDN migration for hero video assets ([#20](https://github.com/Neiland85/festival-platform-template/issues/20)) ([0b3cff8](https://github.com/Neiland85/festival-platform-template/commit/0b3cff8410b83da4f440436754e4400d3cb426ee))
* **infra:** CI ephemeral DB, migration safeguards, backup script ([#25](https://github.com/Neiland85/festival-platform-template/issues/25)) ([5f1e4ad](https://github.com/Neiland85/festival-platform-template/commit/5f1e4adf3b60b4ac14b7275a625ae648db1f4d23))
* **observability:** structured JSON logger, correlation ID, latency tracking ([f3dbf34](https://github.com/Neiland85/festival-platform-template/commit/f3dbf34d26728df9ac0430f19037447fc86018c6))
* **qa:** add PR template, contributing guide, and security PR script ([a84c18d](https://github.com/Neiland85/festival-platform-template/commit/a84c18d5fcce9738cc360675b1310b95b84cc2de))
* **release:** add semantic-release pipeline, changelog, and PR template ([3d4f4ba](https://github.com/Neiland85/festival-platform-template/commit/3d4f4ba3e42c7f52b26436edfde1582009aecaa2))
* replace footer with Clarity logo + orbital/chromatic effects, reorder sections ([1963f61](https://github.com/Neiland85/festival-platform-template/commit/1963f612d499c304bc7bb6314c260e1acd027c93))
* replace hero video with Tomorrowland aftermovie ([e13a12a](https://github.com/Neiland85/festival-platform-template/commit/e13a12a79bff061a2fe93b950c7762df20849393))
* **security:** sliding window rate limiter, env-configurable, middleware integration ([703b1ba](https://github.com/Neiland85/festival-platform-template/commit/703b1baa87b8bbc09522107803b6edfd71f92f7c))
* **sre:** k6 profiles, GitHub Action, Prometheus/Grafana alerting ([#24](https://github.com/Neiland85/festival-platform-template/issues/24)) ([60356aa](https://github.com/Neiland85/festival-platform-template/commit/60356aa32c3c57149bf36028c98b5c60e2c14964))
* Stripe event checkout integration + pipeline fixes (ADR-003) ([603e3d8](https://github.com/Neiland85/festival-platform-template/commit/603e3d83c5a07059b5f26cc85c392ee64d306ce7))

### Fixed

* add generateStaticParams for locales ([8d63fc8](https://github.com/Neiland85/festival-platform-template/commit/8d63fc8da6646ca37099e5e14d2343ca5985b807))
* apply Copilot review suggestions from PR [#25](https://github.com/Neiland85/festival-platform-template/issues/25) ([#27](https://github.com/Neiland85/festival-platform-template/issues/27)) ([22bf10b](https://github.com/Neiland85/festival-platform-template/commit/22bf10b466006afd80608037c8bca3c88ade1c59))
* await locale params in app router ([40c8307](https://github.com/Neiland85/festival-platform-template/commit/40c83070dcc3f5af3fb6ec1ec3898a01db0a163e))
* **build:** skip strict env validation during next build phase ([bda1f23](https://github.com/Neiland85/festival-platform-template/commit/bda1f230e659ac93e0eac6c8ae2493af57268185))
* **ci:** add Postgres service container for E2E, conditional SSL in pool ([25cee17](https://github.com/Neiland85/festival-platform-template/commit/25cee17f525cee22c7214e10007ed519d80251e8))
* **ci:** inject dummy env vars for test, build, and E2E jobs ([f8e4a99](https://github.com/Neiland85/festival-platform-template/commit/f8e4a99b514fc49662b6fd0637dcafc9f09945e0))
* **ci:** inject dummy env vars for test, build, and E2E jobs ([3e19335](https://github.com/Neiland85/festival-platform-template/commit/3e19335d439aa0479de073e21ab760598541184e))
* **ci:** remove duplicate env block in e2e job ([550b760](https://github.com/Neiland85/festival-platform-template/commit/550b760ee11342c36eb00016dd4a6975a40a82a4))
* **ci:** remove neonctl auth login — CLI reads NEON_API_KEY from env ([0a484b0](https://github.com/Neiland85/festival-platform-template/commit/0a484b069d64691fb0a1befbe4cc5a6511e435b5))
* **ci:** resolve E2E job hanging indefinitely ([95c5ace](https://github.com/Neiland85/festival-platform-template/commit/95c5acef07e9abbf9048638e162b60bd5dca17ac))
* **ci:** resolve lint warning and test env validation crashes ([83a16a2](https://github.com/Neiland85/festival-platform-template/commit/83a16a26a6add3cb70ff601e40dff05b2818264e))
* **ci:** upgrade Node to 22 in release workflow ([6f4b7f7](https://github.com/Neiland85/festival-platform-template/commit/6f4b7f729c25969def8bb98c3acbe71a723f3285))
* clean workflow conditions ([90ce615](https://github.com/Neiland85/festival-platform-template/commit/90ce61530f09d84c172f491579863b9813580322))
* correct locale test page ([11daad1](https://github.com/Neiland85/festival-platform-template/commit/11daad14fb2cbc70801accf46096e36fd1ae936d))
* **deps:** remove residual package-lock.json causing false Dependabot alerts ([#21](https://github.com/Neiland85/festival-platform-template/issues/21)) ([aa6813a](https://github.com/Neiland85/festival-platform-template/commit/aa6813a3610f5e75f9d7bfce1dc330171017042c)), closes [#12](https://github.com/Neiland85/festival-platform-template/issues/12)
* **e2e:** accept en/es locale, use body not main, fix strict mode ([abc186c](https://github.com/Neiland85/festival-platform-template/commit/abc186c826d9f4b0311278d99c271f3b7b422d07))
* **e2e:** align all tests with actual app DOM and API routes ([1d19114](https://github.com/Neiland85/festival-platform-template/commit/1d19114cab5019bcf5f675c85251f79a7258db1f))
* **e2e:** final alignment — seo skips, admin selectors, cleanup ([744a2ef](https://github.com/Neiland85/festival-platform-template/commit/744a2ef197390503f05d4d3891f98ea707671ba2)), closes [#password](https://github.com/Neiland85/festival-platform-template/issues/password)
* **e2e:** rewrite tests to match actual app — eliminates infinite hang ([4e6d017](https://github.com/Neiland85/festival-platform-template/commit/4e6d01786518cf6b16bef90b48d7701815378ad4))
* **env:** accept POSTGRES_URL as fallback for DATABASE_URL ([1831a6a](https://github.com/Neiland85/festival-platform-template/commit/1831a6aea1c88f7facd986c6e2c95c0e5573f3ea))
* **hydration:** add lang attribute to <html>, fix i18n siteName interpolation ([2ec555c](https://github.com/Neiland85/festival-platform-template/commit/2ec555c4467695bda78b0d358c95a28b81ce6604))
* move messages into src for alias resolution ([fbdf274](https://github.com/Neiland85/festival-platform-template/commit/fbdf274b872d774c84bc20091542d2750d47f05f))
* overlay hero video text with dynamic siteName from config ([5fcc7f1](https://github.com/Neiland85/festival-platform-template/commit/5fcc7f1919313d173928832db5b37f037607b73a))
* pin typescript v5 for compatibility ([573e41e](https://github.com/Neiland85/festival-platform-template/commit/573e41ef9005db48b248a41a7170532bca3fb52a))
* **pool:** remove statement_timeout option incompatible with Neon pooler ([dffa44e](https://github.com/Neiland85/festival-platform-template/commit/dffa44eef39159f25e92e5e09bcc291b0cd0c6f7))
* **pool:** revert to rejectUnauthorized:false for Neon pooler compat ([b53b93a](https://github.com/Neiland85/festival-platform-template/commit/b53b93a6d26ef64bbacb15ef90bd5d09ada09b19))
* **queue:** Production-critical bug fixes for distributed apply system ([24ab339](https://github.com/Neiland85/festival-platform-template/commit/24ab339866e926ed93273ba03ed031f2efb16518))
* regenerate pnpm-lock.yaml after Dependabot merge conflict ([35bbf08](https://github.com/Neiland85/festival-platform-template/commit/35bbf08b3f2fe4fb06fe00db36d20a9a9e0b538a))
* remove large files properly ([f513751](https://github.com/Neiland85/festival-platform-template/commit/f51375172417b493b9af18ac3f8dab9858a3af67))
* remove nested html/body from locale layout ([c96f4b7](https://github.com/Neiland85/festival-platform-template/commit/c96f4b727b48bc0e5274d4bff3ec8d3818996ba2))
* resolve build + redis buffer typing ([4a3b5d0](https://github.com/Neiland85/festival-platform-template/commit/4a3b5d0b3bba0f0da8bfdf9bd55f364ae806d6b2))
* resolve CI pipeline failures and all TypeScript errors ([b5aff05](https://github.com/Neiland85/festival-platform-template/commit/b5aff052594640d7972a1fdcd9733205d5578237))
* resolve js-yaml prototype pollution vulnerability (CVE-2025-64718) ([20d4e61](https://github.com/Neiland85/festival-platform-template/commit/20d4e61af84def1750570cc6bf79b68ca94365c7))
* root redirect + cleanup middleware ([04163c2](https://github.com/Neiland85/festival-platform-template/commit/04163c2089384d44f219b94e79470a067a76e24d))
* **security:** upgrade Next.js 16.1.6 → 16.1.7 + harden CI pipeline ([2a51f07](https://github.com/Neiland85/festival-platform-template/commit/2a51f07687e9cf217040d7f8b5d3337682aeb997))
* **tests:** align test values with Zod-cached serverEnv ([33e9808](https://github.com/Neiland85/festival-platform-template/commit/33e9808947cbbe4aed48108435cfe9ee2f0daacf))
* **types:** resolve sanity/next-sanity type errors for CI green ([27d53ad](https://github.com/Neiland85/festival-platform-template/commit/27d53adf65dfa397798cc50092112438fa32783c))
* unify app under locale routing ([db1ab76](https://github.com/Neiland85/festival-platform-template/commit/db1ab76a2c3de5af250dca1d1b45db4891eeec9e))
* working i18n with next-intl ([8978ad7](https://github.com/Neiland85/festival-platform-template/commit/8978ad75042a5eb9eec0ae389768726bfbe69f4e))

### Changed

* pivot from festival template to asset marketplace platform ([b03d971](https://github.com/Neiland85/festival-platform-template/commit/b03d971b608279e16c59be3be9fdf1655bfca61e))

### Security

* eliminate UUID session fallback, enforce HMAC-SHA256 signed tokens ([192d5fd](https://github.com/Neiland85/festival-platform-template/commit/192d5fd295a5ebb2a1b91b7aa4ebe1bd53f82ecb))
* **stripe:** harden webhook with raw Buffer, event.id idempotency, payment_intent handler ([f92b91b](https://github.com/Neiland85/festival-platform-template/commit/f92b91b465f5909d5a00802672158118fb3c5f18))

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
