# Contribuir a Solaris Nerja

## Requisitos previos

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ (o Supabase)
- Redis (opcional, para rate limiting y queue distribuido)

## Setup local

```bash
git clone git@github.com:Neiland85/solarisnerja.git
cd solarisnerja
cp .env.example .env.local   # edita con tus credenciales
pnpm install
pnpm dev
```

## Scripts principales

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm verify` | Lint + typecheck + tests + build (pre-push) |
| `pnpm lint` | ESLint (zero warnings) |
| `pnpm typecheck` | TypeScript strict |
| `pnpm test` | Tests unitarios (vitest) |
| `pnpm test:e2e` | Tests E2E (Playwright) |
| `pnpm audit:prod` | Auditoría de seguridad (prod deps) |

## Estructura del proyecto

```
src/
├── adapters/db/       # Repositorios PostgreSQL
├── app/               # Next.js App Router (pages + API routes)
├── contracts/schemas/ # JSON Schema para validación
├── domain/            # Lógica de negocio pura
├── lib/               # Utilidades transversales
│   ├── auth/          # Autenticación + RBAC
│   ├── observability/ # Métricas, audit log, tracing
│   └── security/      # Rate limiting, CSRF, queue, idempotency
└── ui/components/     # Componentes React
```

## Convenciones

- **Commits**: mensajes en inglés, imperativos, concisos. Ejemplo: `fix: prevent duplicate lead submissions via idempotency key`
- **Branches**: `feat/`, `fix/`, `chore/` desde `main`
- **Tests**: todo módulo nuevo requiere tests. Cobertura mínima: funciones exportadas
- **Lint**: `--max-warnings=0`. No se mergea con warnings

## Pre-push checks

El hook de pre-push ejecuta `pnpm verify`. Si falla, el push se bloquea. No usar `--no-verify`.

## Seguridad

- No commitear `.env`, credenciales, o tokens
- Usar `hashIp()` para cualquier IP que se persista
- Consent RGPD requerido antes de almacenar datos personales
- Reportar vulnerabilidades por email a: bookingnadarecords@gmail.com

## CI/CD

GitHub Actions ejecuta en cada PR y push a main:
1. `pnpm audit --prod --audit-level=moderate`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

Deploy automático en Vercel al mergear a `main`.
