# Hardening Analysis — Festival Engine

**Fecha**: 2026-03-21
**Scope**: Conexiones Neon, env vars multi-entorno, Vercel Serverless/Edge

---

## 1. Bugs futuros simulados — Neon

### BUG-01: `too many connections` en picos de tráfico

**Escenario**: 50 funciones Lambda concurrentes × `max: 10` conexiones/pool = 500 conexiones. Neon free tier permite ~100.

**Síntoma**: `FATAL: too many connections for role "neondb_owner"` intermitente en horarios pico.

**Prevención aplicada**: `max: 3` en serverless (pool.ts). Con 30 instancias = 90 conexiones < 100 límite.

**Mejora futura**: Usar Neon's connection pooler (PgBouncer) en la URL (`-pooler` suffix ya presente). Para Pro tier, subir a `max: 5`.

### BUG-02: Cold start timeouts

**Escenario**: Primera request tras 5min inactividad. Neon suspende el compute → cold start 3-7s. Con `connectionTimeoutMillis: 5000` → timeout antes de que Neon despierte.

**Síntoma**: `Error: Connection terminated due to connection timeout` esporádico en madrugada/baja actividad.

**Prevención aplicada**: `connectionTimeoutMillis: 10_000` (pool.ts). Absorbe cold starts sin enmascarar problemas reales.

**Mejora futura**: Cron job cada 4min haciendo `GET /api/readyz` para mantener Neon despierto (solo en Pro tier, no free).

### BUG-03: Idle client disconnect → crash del proceso

**Escenario**: Neon desconecta clientes idle tras 5min. El pool tiene un client idle → emite evento `error` → sin handler → `UnhandledPromiseRejectionWarning` → Node.js crash en Vercel.

**Síntoma**: 500s aleatorios sin stack trace claro. Logs: `Unexpected pool error: Connection terminated unexpectedly`.

**Prevención aplicada**: Handler en `pool.on("error")` que destruye el pool y permite recreación limpia en la siguiente llamada.

### BUG-04: Queries bloqueantes sin timeout

**Escenario**: Un `SELECT` con full table scan en `leads` (sin `WHERE`) bloquea la conexión 45s. Vercel mata la función a los 30s (Hobby) → la conexión queda huérfana en Neon.

**Síntoma**: Pool agotado progresivamente. Cada request lenta deja una conexión zombie.

**Prevención aplicada**: `statement_timeout=25000` (25s) via pool options. Neon cancela la query antes de que Vercel mate la función.

### BUG-05: SSL cert rotation

**Escenario**: Neon rota sus certificados. Con `rejectUnauthorized: false` → sin impacto (pero inseguro). Con `rejectUnauthorized: true` → posible rechazo temporal.

**Prevención aplicada**: `rejectUnauthorized: true` solo en producción (certs de Neon son de CA pública, no self-signed). En dev se relaja para evitar fricciones.

**Mejora futura**: Pinning del CA root de Neon en producción para máxima seguridad.

---

## 2. Bugs futuros simulados — Env vars

### BUG-06: Variable definida en scope incorrecto

**Escenario**: Se añade `STRIPE_SECRET_KEY` solo en `production`. Los preview deployments (PRs) no la tienen → Stripe deshabilitado en previews sin aviso.

**Prevención aplicada**: Warnings post-parse en env.ts que detectan configuraciones peligrosas.

**Mejora futura**: Crear `.env.preview` scope en Vercel con valores de test (`sk_test_...`). Documentar en `.env.example` qué scopes necesita cada variable.

### BUG-07: Secreto con whitespace/newline

**Escenario**: `vercel env add` incluye `\n` al final del valor pegado → Zod lo acepta como string válido → HMAC falla en runtime porque el hash no coincide.

**Prevención aplicada**: `.trim()` en `nonEmpty` helper de Zod. SESSION_SECRET y ADMIN_PASSWORD se trimean automáticamente.

**Mejora**: Añadir `.trim()` explícito al schema de `DATABASE_URL`:

```typescript
DATABASE_URL: z.string().trim().url().min(1)
```

### BUG-08: POSTGRES_URL vs DATABASE_URL drift

**Escenario**: Vercel Neon integration crea `POSTGRES_URL`. El código espera `DATABASE_URL`. Se añade `DATABASE_URL` manualmente apuntando a Neon. Meses después, Neon rota la password automáticamente en `POSTGRES_URL` → `DATABASE_URL` queda desactualizada → 500s en producción.

**Prevención aplicada**: Eliminado el fallback. Solo `DATABASE_URL` existe.

**Mejora futura**: En Vercel Dashboard, crear `DATABASE_URL` como **Reference** apuntando a `POSTGRES_URL` (Vercel Settings → Environment Variables → Add → Reference). Así se sincronizan automáticamente.

---

## 3. Soporte multi-entorno (staging, preview, production)

### Arquitectura recomendada

```
┌─────────────┬──────────────────────────────┬─────────────┐
│ Entorno     │ DATABASE_URL                  │ Stripe      │
├─────────────┼──────────────────────────────┼─────────────┤
│ local       │ .env.local → Neon (o local)  │ sk_test_    │
│ preview     │ Vercel env (preview scope)   │ sk_test_    │
│ staging     │ Vercel env (preview scope)*  │ sk_test_    │
│ production  │ Vercel env (production)      │ sk_live_    │
└─────────────┴──────────────────────────────┴─────────────┘

* staging = preview deployment en branch `staging`
```

### Configuración Vercel recomendada

| Variable | Production | Preview | Development |
|---|---|---|---|
| `DATABASE_URL` | Neon main branch | Neon dev branch (o misma) | — |
| `SESSION_SECRET` | `openssl rand -base64 48` | Diferente | — |
| `ADMIN_PASSWORD` | Fuerte, único | Test value | — |
| `STRIPE_SECRET_KEY` | `sk_live_...` | `sk_test_...` | — |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (live) | `whsec_...` (test) | — |
| `CSRF_SECRET` | Único, fuerte | Diferente | — |

### Neon Branching (recomendado para preview)

Neon soporta branches de DB (como git branches). Cada preview deployment puede usar su propia branch de DB:

```
Neon main branch → production
Neon dev branch → preview deployments + local dev
```

Esto aísla datos de producción de pruebas.

---

## 4. Vercel Edge vs Serverless

### Compatibilidad actual

| Componente | Serverless | Edge |
|---|---|---|
| `pg` (node-postgres) | ✅ | ❌ (usa TCP sockets) |
| `@neondatabase/serverless` | ✅ | ✅ (usa WebSocket/HTTP) |
| Drizzle + `pg` | ✅ | ❌ |
| Drizzle + `@neondatabase/serverless` | ✅ | ✅ |

### Recomendación

El stack actual (`pg` + Pool) funciona en Serverless. Para Edge (si se necesita en futuro):

1. Reemplazar `pg` por `@neondatabase/serverless`
2. Usar el driver HTTP de Neon (sin pool, sin TCP)
3. Es un cambio de 1 archivo (pool.ts) — la app no necesita cambios

No migrar a Edge ahora — el middleware ya corre en Edge pero no toca DB. Las API routes en Serverless son correctas.

---

## 5. Checklist de verificación pre-venta (15-25k)

- [x] Sin fallbacks peligrosos en env vars
- [x] Pool hardened para serverless (max, idle, timeout, statement_timeout)
- [x] Graceful pool recovery en idle disconnect
- [x] Production safety warnings (dev defaults detectados)
- [x] SSL correctamente configurado por entorno
- [ ] `DATABASE_URL` configurado como Reference en Vercel (manual)
- [ ] `CSRF_SECRET` e `IP_HASH_SALT` con valores reales en producción
- [ ] Neon branching para preview deployments
- [ ] Health check cron para evitar cold starts
- [ ] `@neondatabase/serverless` para Edge readiness futuro
