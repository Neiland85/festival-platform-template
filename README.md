# Solaris Nerja — Festival Platform

**Plataforma web de captación, venta de entradas y operación** para el festival Solaris Nerja (Costa del Sol, verano 2026).

Stack: **Next.js 16 · React 19 · TypeScript 5 · Tailwind 4 · PostgreSQL (Supabase) · Vercel**

> Licencia propietaria — ver [`LICENSE`](./LICENSE)

---

## Índice

- [Arquitectura general](#arquitectura-general)
- [Estructura de directorios](#estructura-de-directorios)
- [Domain-Driven Design](#domain-driven-design)
- [Seguridad y middleware](#seguridad-y-middleware)
- [Observabilidad (M1–M10)](#observabilidad-m1m10)
- [Lead capture y RGPD](#lead-capture-y-rgpd)
- [Integración Meta Pixel](#integración-meta-pixel)
- [Ticketmaster](#ticketmaster)
- [Dashboard admin](#dashboard-admin)
- [Base de datos y migraciones](#base-de-datos-y-migraciones)
- [API REST v1](#api-rest-v1)
- [CI/CD y despliegue](#cicd-y-despliegue)
- [Testing](#testing)
- [Configuración local](#configuración-local)
- [Scripts disponibles](#scripts-disponibles)
- [Autor](#autor)

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL EDGE                        │
│  middleware.ts (auth · CORS · request-id)               │
├─────────────────────────────────────────────────────────┤
│                     NEXT.JS 16 APP                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │  Public   │  │ Dashboard│  │      API Layer        │ │
│  │  Pages    │  │  (Admin) │  │  /api/v1/*  (public)  │ │
│  │  /        │  │  /dash   │  │  /api/admin/* (auth)  │ │
│  │  /eventos │  │  board/* │  │  /api/readyz          │ │
│  └────┬─────┘  └────┬─────┘  └──────────┬────────────┘ │
│       │              │                   │              │
│  ┌────▼──────────────▼───────────────────▼────────────┐ │
│  │              DOMAIN LAYER (pure TS)                │ │
│  │  domain/leads   domain/events   contracts/schemas  │ │
│  └────────────────────────┬───────────────────────────┘ │
│                           │                             │
│  ┌────────────────────────▼───────────────────────────┐ │
│  │            INFRASTRUCTURE                          │ │
│  │  adapters/db (pg pool)  ·  lib/security            │ │
│  │  lib/observability      ·  lib/cache               │ │
│  └────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│               SUPABASE (PostgreSQL)                     │
└─────────────────────────────────────────────────────────┘
```

Principios aplicados: separación estricta dominio/infra, contratos JSON Schema validados con AJV, capa de observabilidad no invasiva (wrappers), seguridad en middleware (edge), soft-delete RGPD.

---

## Estructura de directorios

```
src/
├── adapters/db/          # Repositorios PostgreSQL (pool, lead-repo, event-repo)
├── app/
│   ├── api/
│   │   ├── v1/           # Endpoints públicos (leads, events, auth)
│   │   ├── admin/        # Endpoints protegidos (metrics, traces, health, ...)
│   │   ├── healthz/      # Health check
│   │   └── readyz/       # Readiness probe
│   ├── dashboard/        # Panel admin (leads, events, CRUD)
│   ├── eventos/[eventId] # Detalle de evento (SSR + OG dinámico)
│   ├── contacto/         # Página de contacto
│   ├── login/            # Login admin
│   ├── privacidad/       # Política de privacidad
│   └── ubicacion/        # Mapa del recinto
├── config/               # Configuración de eventos y constantes
├── contracts/schemas/    # JSON Schema (AJV) para validación de payloads
├── domain/
│   ├── leads/            # Entidad Lead, factory, tipos, tests
│   └── events/           # Entidad Event, factory, update
├── lib/
│   ├── api/              # safeHandler (error boundary API)
│   ├── auth/             # Utilidades de autenticación
│   ├── cache/            # Capa de caché
│   ├── observability/    # M1–M10: métricas, trazas, alertas, SEO, auditoría
│   └── security/         # Rate limit, burst queue, circuit breaker, CORS, overload
├── ui/components/        # Componentes React (público + dashboard)
│   ├── dashboard/        # Cards y widgets del panel admin
│   └── sections/         # Secciones de la landing
├── middleware.ts          # Auth, CORS, request-id (edge)
sql/                       # Schema DDL completo
migrations/                # Migraciones incrementales (001–004)
```

---

## Domain-Driven Design

El dominio está aislado de frameworks e infraestructura.

**Bounded Contexts:**

- **Leads** — captación de contactos: factory `createLead()` normaliza email, genera UUID, asigna `source`. Campos: email, eventId, ipAddress, consentGiven, name, surname, phone, profession, source.
- **Events** — gestión de eventos del festival: factory `createEvent()`, `updateEvent()`, validación con JSON Schema.

**Contratos:** `contracts/schemas/` contiene JSON Schemas (draft 2020-12) validados con AJV en los endpoints. Cada payload de entrada tiene un schema declarativo.

**Repositorios:** `adapters/db/` implementa la persistencia contra PostgreSQL con `pg` nativo (sin ORM). Upsert idempotente en leads (`ON CONFLICT DO UPDATE`), soft-delete (`deleted_at`).

---

## Seguridad y middleware

| Capa | Componente | Función |
|------|-----------|---------|
| Edge | `middleware.ts` | Auth check (dashboard + admin API), CORS origin whitelist, `x-request-id` en cada request |
| API | `safeHandler` | Error boundary genérico que atrapa excepciones y devuelve 500 limpio |
| API | `rate-limit.ts` | Rate limiting por IP (in-memory sliding window) |
| Infra | `burstQueue.ts` | Cola en memoria para absorber picos de leads |
| Infra | `leadWorker.ts` | Worker que drena la cola y persiste en PostgreSQL |
| Infra | `circuitBreaker.ts` | Circuit breaker para dependencias externas |
| Infra | `dbCircuitBreaker.ts` | Circuit breaker específico para la DB |
| Infra | `overload.ts` | Protección contra sobrecarga del servidor |
| Auth | Cookie-based | Sesión admin via cookie `admin_session`, validada en middleware |

---

## Observabilidad (M1–M10)

Diez módulos independientes en `lib/observability/`, cada uno con tests unitarios:

| Módulo | Archivo | Descripción |
|--------|---------|-------------|
| M1 | `metricsCollector.ts` | Métricas por ruta: latencia P50/P95/P99, throughput, error rate |
| M2 | `requestTracer.ts` | Trazas distribuidas con correlation ID |
| M3 | `auditLog.ts` | Log de auditoría para acciones admin |
| M4 | `queueAlert.ts` | Alertas cuando la cola de leads supera umbrales |
| M5 | `poolMonitor.ts` | Monitorización del pool de conexiones PostgreSQL |
| M6 | `surgePredictor.ts` | Predicción de picos de tráfico |
| M7 | `correlationEngine.ts` | Correlación entre métricas para detectar anomalías |
| M8 | `safetyScorecard.ts` | Scorecard de salud del sistema (puntuación agregada) |
| M9 | `seoMonitor.ts` | Monitorización de indicadores SEO |
| M10 | — | Endpoints admin consolidados (`/api/admin/*`) |

Todos los módulos son in-memory (aceptable para serverless con cold starts) y se integran como wrappers opcionales (`withMetrics(handler)`), sin modificar la lógica de negocio.

---

## Lead capture y RGPD

Flujo de captación de leads con cumplimiento RGPD:

1. **PromoFormSection** — CTA "Entradas gratis + 2x1" → pantalla de consentimiento RGPD → formulario (email, teléfono, nombre, apellidos, profesión opcional) → confirmación.
2. **Consentimiento explícito** — El usuario debe aceptar la política de privacidad antes de ver el formulario. Sin consentimiento, no se captura ningún dato.
3. **Soft-delete** — Los leads tienen `deleted_at` para cumplir con derecho de supresión (RGPD Art. 17).
4. **Índice por email** — Facilita solicitudes de acceso (RGPD Art. 15) y portabilidad.
5. **CookieBanner** — Banner de cookies con aceptación/rechazo. La cookie `sn_cookie_consent` controla la carga de servicios de terceros.

---

## Integración Meta Pixel

- **Carga condicional**: `MetaPixel.tsx` solo inyecta el script de Facebook cuando `sn_cookie_consent=accepted` (vía `useSyncExternalStore`).
- **Pixel ID**: desde variable de entorno `NEXT_PUBLIC_FB_PIXEL_ID` (no hardcoded).
- **Eventos estándar**: `tracking.ts` mapea eventos internos a eventos estándar de Meta (`Lead`, `ViewContent`, `InitiateCheckout`, `Purchase`) para optimización de campañas en Meta Ads.
- **ViewContentTracker**: componente invisible que dispara `ViewContent` al cargar una página de evento.
- **Open Graph**: metadata completa en `layout.tsx` (global) y por evento (dinámico) para compartir en redes sociales.

---

## Ticketmaster

- Cada evento tiene un `ticketUrl` configurable en `src/config/events.ts`.
- `TicketmasterWidget.tsx` soporta tres estados:
  - **Universe iframe** — embed directo si la URL es de Universe.
  - **Link directo** — botón "Comprar Entradas" para URLs de Ticketmaster.
  - **Próximamente** — si no hay URL configurada.
- Los botones de compra redirigen actualmente a la página del artista en Ticketmaster.

---

## Dashboard admin

Panel protegido en `/dashboard` con autenticación via middleware:

- **Leads** — tabla con listado, filtros, exportación.
- **Events** — CRUD de eventos (crear, editar, activar/desactivar).
- **Observabilidad** — métricas en tiempo real, health checks, forecast de asistencia, trending events, viral detection.
- **Componentes**: `LeadsChart`, `CapacityProgress`, `TrendingCard`, `SystemStatusCard`, `FestivalHealthCard`, `SoldOutAlert`, `ForecastCard`, `ViralEventCard`, `AttendanceForecastCard`.

---

## Base de datos y migraciones

**PostgreSQL en Supabase** con schema versionado:

```
sql/schema.sql          → Schema completo (DDL de referencia)
migrations/
├── 001_initial.sql
├── 002_event_capacity.sql
├── 003_event_metadata.sql
└── 004_lead_profile_fields.sql
```

Tablas principales:

- `leads` — con unique index `(email, event_id)`, upsert idempotente, soft-delete, índice RGPD por email.
- `events` — gestión desde dashboard, flag `active` para activar/desactivar.

Conexión via `pg` nativo con pool gestionado en `adapters/db/pool.ts`.

---

## API REST v1

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/leads` | — | Captura de lead (validación JSON Schema) |
| GET | `/api/v1/events` | — | Listado de eventos activos |
| GET | `/api/v1/events/[id]` | — | Detalle de evento |
| POST | `/api/v1/auth/login` | — | Login admin (cookie session) |
| POST | `/api/v1/auth/logout` | — | Logout admin |
| GET | `/api/admin/*` | Admin | 15+ endpoints de observabilidad y gestión |
| GET | `/api/readyz` | — | Readiness probe |
| GET | `/api/healthz` | — | Health check |

Todas las rutas admin están protegidas en middleware (edge) — la request ni siquiera llega al handler si no hay sesión válida.

---

## CI/CD y despliegue

```
GitHub Actions (ci.yml)
  └── pnpm install → lint → test → build

Vercel
  └── Preview deployments (PR) → Production (main)
```

- **Lint**: ESLint con reglas de Next.js + Tailwind (`--max-warnings=0`).
- **Tests**: Vitest (unit tests para dominio, observabilidad, API).
- **Build**: `next build` en CI y en Vercel.
- **Pre-push hook**: ejecuta `pnpm verify` (lint + test + build) antes de cada push.
- **Dependabot**: actualización automática de dependencias.

---

## Testing

**147 archivos fuente · 14 archivos de test · Vitest**

Cobertura de tests unitarios en:

- Dominio: `create-lead.test.ts` (normalización, campos opcionales, source)
- Observabilidad: tests para M1–M9 (metricsCollector, requestTracer, auditLog, queueAlert, poolMonitor, surgePredictor, correlationEngine, safetyScorecard, seoMonitor)
- API: `route.test.ts` para leads
- Seguridad: `rate-limit.test.ts`

```bash
pnpm test          # Ejecutar todos los tests
pnpm test:watch    # Modo watch
```

---

## Configuración local

1. Clonar el repositorio
2. Copiar `.env.example` → `.env.local` y rellenar las variables
3. Instalar dependencias:

```bash
pnpm install
```

4. Ejecutar migraciones contra Supabase (ver `migrations/`)
5. Lanzar en desarrollo:

```bash
pnpm dev
```

Variables de entorno requeridas (ver `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clave anónima de Supabase
- `DATABASE_URL` — Connection string PostgreSQL
- `ADMIN_PASSWORD` — Contraseña del panel admin
- `NEXT_PUBLIC_FB_PIXEL_ID` — ID del Meta Pixel (opcional)

---

## Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Dev | `pnpm dev` | Servidor de desarrollo (Next.js) |
| Build | `pnpm build` | Build de producción |
| Start | `pnpm start` | Servidor de producción |
| Lint | `pnpm lint` | ESLint con zero warnings |
| Test | `pnpm test` | Vitest (ejecución única) |
| Test watch | `pnpm test:watch` | Vitest en modo watch |
| Format | `pnpm format` | Prettier |
| Verify | `pnpm verify` | lint + test + build (pre-push) |
| Typecheck | `pnpm typecheck` | TypeScript sin emit |

---

## Autor

**Neil Muñoz Lago** — Senior Backend Architect · Distributed Systems

Contacto: admin@claritystructures.com

---

© 2026 Neiland85 / Solaris Nerja. Todos los derechos reservados.
