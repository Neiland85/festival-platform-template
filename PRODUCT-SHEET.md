# Product Sheet — Festival Platform Template

> Documento interno de referencia. Define todos los parámetros del producto
> para ventas, marketing, legal y soporte.
>
> Última actualización: 2026-03-19

---

## 1. IDENTIDAD DE PRODUCTO

| Parámetro | Valor |
|---|---|
| **Nombre comercial** | Festival Platform |
| **Nombre técnico** | festival-platform-template |
| **Categoría** | White-label ticketing platform (source code license) |
| **Tagline principal** | Lanza tu plataforma de festival esta semana. No el próximo trimestre. |
| **Tagline secundaria** | 6 semanas de infraestructura. 30 segundos de setup. |
| **Posicionamiento** | Plataforma white-label de ticketing, NO un starter kit ni boilerplate |
| **Competencia directa** | Eventbrite, Eventcube, InEvent, Cvent (SaaS), NO ShipFast/Supastarter (templates) |
| **Diferenciador clave** | Pago único por código fuente vs. suscripción anual + comisión por ticket |
| **URL del producto** | TBD |
| **URL demo** | TBD |

---

## 2. ESPECIFICACIONES TÉCNICAS (NÚMEROS EXACTOS)

### 2.1 Codebase

| Métrica | Valor exacto |
|---|---|
| Archivos TypeScript (src/) | 155 |
| Archivos fuente (sin tests) | 128 |
| Archivos de test | 27 |
| Líneas de código (src/, sin tests) | 12,171 |
| Casos de test unitarios/integración | 354 (`it()` patterns) |
| Tests E2E (Playwright) | 7 specs |
| API routes (route.ts) | 29 endpoints |
| React components (.tsx) | 24 componentes |
| Dependencias producción | 13 paquetes |
| Dependencias desarrollo | 21 paquetes |
| Total dependencias | 34 paquetes |

### 2.2 Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Lenguaje | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Base de datos | PostgreSQL | 15 (Docker) |
| ORM | Drizzle ORM | ^0.44.0 |
| Pagos | Stripe SDK | ^20.4.1 |
| CMS (opcional) | Sanity | ^5.16.0 |
| i18n | next-intl | ^4.8.3 |
| Validación | Zod | ^3.24.4 |
| Error tracking | Sentry | ^10.43.0 |
| Rate limiting | Upstash Redis | ^1.34.3 |
| Testing | Vitest + Playwright | ^4.0.18 / ^1.58.2 |
| Linting | ESLint | ^9 |
| Formatting | Prettier | ^3.8.1 |
| CI/CD | GitHub Actions | 1 workflow |
| Container | Docker Compose | PostgreSQL 15 |

### 2.3 Módulos de seguridad (12 archivos, 11 módulos funcionales)

| Módulo | Archivo | Función |
|---|---|---|
| CSRF protection | verifyCsrf.ts | Token validation con opt-in enforcement |
| Idempotency (Redis) | idempotency.ts | Deduplicación de requests con Redis + fallback in-memory |
| Idempotency (domain) | enforced-idempotency.ts | Enforcement a nivel de dominio |
| Domain idempotency | domainIdempotency.ts | Pre-insert idempotency pattern |
| Distributed queue | redisQueue.ts | Job queue con Postgres outbox pattern |
| Lead worker | leadWorker.ts | Procesamiento async de leads |
| Chaos monkey | chaosMonkey.ts | Chaos engineering para testing de resiliencia |
| Burst queue | burstQueue.ts | Absorción de picos de tráfico |
| IP hashing | hashIp.ts | Anonimización de IPs (GDPR) |
| Overload protection | overload.ts | Backpressure y protección contra sobrecarga |
| Queue facade | queueFacade.ts | Abstracción de cola (Redis vs. in-memory) |

### 2.4 Módulos de observabilidad (9 módulos + 9 tests)

| Módulo | Archivo | Función |
|---|---|---|
| Audit log | auditLog.ts | Trail de acciones admin (GDPR) |
| Correlation engine | correlationEngine.ts | Correlación de requests cross-service |
| Metrics collector | metricsCollector.ts | Agregación de métricas |
| Pool monitor | poolMonitor.ts | Monitorización de connection pool de DB |
| Queue alert | queueAlert.ts | Alertas de salud de colas |
| Request tracer | requestTracer.ts | Tracing y timing de requests |
| Safety scorecard | safetyScorecard.ts | Health scoring A-F en 8 dimensiones |
| SEO monitor | seoMonitor.ts | Tracking de rendimiento SEO |
| Surge predictor | surgePredictor.ts | Predicción de picos de tráfico |

### 2.5 Load testing (7 archivos)

| Script | Archivo | Cobertura |
|---|---|---|
| Homepage | homepage.js | Homepage bajo carga |
| API health | api-health.js | Endpoints de health bajo stress |
| Lead submission | lead-submission.js | Formulario de leads bajo carga |
| Checkout flow | checkout-flow.js | Flujo de pago Stripe |
| Concurrent users | concurrent-users.js | Ramp 100→500→1,000 VUs |
| Config | config.js | Thresholds compartidos |
| Runner | run-all.sh | Ejecución batch + JSON report |

**SLO thresholds:** p95 < 500ms, p99 < 1,500ms, error rate < 1%

### 2.6 API routes (29 endpoints)

**Admin-protected (19):** health, system, metrics, traces, activity, audit-log, queue-health, queue, forecast, surge, trending, leads-per-day, seo, viral, pool, capacity, scorecard, observability, correlation

**Public (10):** catalog (2), csrf, healthz, readyz, queue/reconcile, v1/auth/login, v1/auth/logout, v1/revalidate, verification

### 2.7 GDPR / Compliance

| Feature | Implementación |
|---|---|
| Cookie consent | CookieBanner.tsx (accept/reject, 180-day persistence, ARIA compliant) |
| Soft deletes | `deletedAt` timestamp en leads (no hard delete) |
| Audit trail | auditLog.ts (who, when, what, ip, resource, details) |
| IP anonymization | hashIp.ts (SHA-256 + salt) |
| Consent tracking | `consent_given` boolean per lead |
| Data minimization | Solo campos necesarios en formularios |
| Audit actions tracked | admin.login, admin.logout, leads.view, leads.export, leads.delete, event.*, system.* |

### 2.8 Internacionalización

| Parámetro | Valor |
|---|---|
| Idiomas incluidos | Español (es.json), English (en.json) |
| Framework | next-intl con routing middleware |
| Añadir idioma | Soltar archivo JSON en messages/ |
| Routing | /es/..., /en/... (locale prefix) |

---

## 3. PRICING

### 3.1 Tiers

| | Indie | Business | Enterprise |
|---|---|---|---|
| **Precio** | $2,900 | $7,900 | $18,000 |
| **Modelo** | One-time | One-time | One-time |
| **Target** | Dev individual, 1 festival | Agencia, múltiples festivales | Empresa de eventos, grupo |
| **Rol de conversión** | Entrada | Objetivo (60-70% revenue) | Anclaje de precio |

### 3.2 Matriz de features por tier

| Feature | Indie | Business | Enterprise |
|---|---|---|---|
| Código fuente completo (128 archivos) | ✅ | ✅ | ✅ |
| Next.js 16 + React 19 + TypeScript 5 | ✅ | ✅ | ✅ |
| Stripe Checkout integration | ✅ | ✅ | ✅ |
| Admin dashboard con auth | ✅ | ✅ | ✅ |
| i18n (ES/EN) | ✅ | ✅ | ✅ |
| Docker Compose + setup automático | ✅ | ✅ | ✅ |
| Documentación completa | ✅ | ✅ | ✅ |
| Graceful degradation (Sanity, Redis, Stripe, Sentry optional) | ✅ | ✅ | ✅ |
| 354+ test cases (unit + integration) | ❌ | ✅ | ✅ |
| 7 E2E tests (Playwright) | ❌ | ✅ | ✅ |
| 11 módulos de seguridad | ❌ | ✅ | ✅ |
| 9 módulos de observabilidad | ❌ | ✅ | ✅ |
| 7 scripts k6 load testing | ❌ | ✅ | ✅ |
| CI/CD pipeline (GitHub Actions) | ❌ | ✅ | ✅ |
| GDPR compliance kit completo | ❌ | ✅ | ✅ |
| Chaos monkey / resilience testing | ❌ | ✅ | ✅ |
| Onboarding video (60 min) | ❌ | ❌ | ✅ |
| Soporte email (72h SLA, 12 meses) | ❌ | ❌ | ✅ |
| Code review de customizaciones (2x) | ❌ | ❌ | ✅ |
| Acceso a roadmap privado | ❌ | ❌ | ✅ |
| Branding completamente removido | ❌ | ✅ | ✅ |
| Contrato de licencia personalizable | ❌ | ❌ | ✅ |

### 3.3 Licencias por tier

| Parámetro | Indie | Business | Enterprise |
|---|---|---|---|
| Desarrolladores | 1 | 5 | Ilimitados |
| Proyectos | 1 | Ilimitados | Ilimitados |
| Uso para clientes | ❌ | ✅ | ✅ |
| Redistribuir template | ❌ | ❌ | ❌ |
| Modificar código | ✅ | ✅ | ✅ |
| Sublicenciar | ❌ | ❌ | ❌ |
| Derivados (producto final) | ✅ (1 proyecto) | ✅ (ilimitados) | ✅ (ilimitados) |
| Updates incluidos | 12 meses | 12 meses + early access | 12 meses + early access |
| Renovación updates | $800/año | $2,000/año | $4,500/año |

---

## 4. PROCESO DE VENTA

### 4.1 Canales por tier

| Tier | Canal | Flujo |
|---|---|---|
| Indie | Self-serve (landing → checkout) | Landing → Lemon Squeezy → descarga automática |
| Business | Self-serve + sales-assisted | Landing → checkout directo O formulario → call → cierre |
| Enterprise | Sales-assisted obligatorio | Formulario → call cualificación → demo → propuesta → PO/factura |

### 4.2 Flujo post-compra

| Paso | Indie | Business | Enterprise |
|---|---|---|---|
| 1. Confirmación | Email automático | Email automático | Email personal del founder |
| 2. Acceso al código | Repo privado GitHub (invite automático) | Repo privado GitHub | Repo privado GitHub + transfer option |
| 3. Onboarding | README + docs | README + docs + GitHub Discussions | Call 60min + README + docs + email soporte |
| 4. Primer contacto | — | Email día 3: "¿Todo ok con el setup?" | Call día 1 + email día 3 |
| 5. Follow-up | Email día 7: upsell soporte | Email día 7: upsell theme pack | Email día 14: feedback + upsell audit |

### 4.3 Delivery mechanism

| Parámetro | Detalle |
|---|---|
| Formato | Repositorio privado en GitHub |
| Acceso | Invite al repo vía GitHub username del comprador |
| Updates | Push a branch `release/stable` — buyer hace pull |
| Revocación | Si detecta redistribución, revoke access al repo |
| Backup | Buyer puede clonar y mantener su propio fork privado |

---

## 5. SOPORTE

### 5.1 SLA por tier

| Parámetro | Indie | Business | Enterprise |
|---|---|---|---|
| Canal | Solo docs | GitHub Discussions | Email dedicado |
| Tiempo de respuesta | — | Best-effort (comunidad) | 72h hábiles |
| Duración | — | Indefinido (comunidad) | 12 meses |
| Scope | — | Dudas de implementación | Dudas + review + troubleshooting |
| Bugs en template | Fix en siguiente release | Fix en siguiente release | Fix prioritario (hotfix branch) |
| Bugs en customización del buyer | Fuera de scope | Fuera de scope | 2 code reviews incluidos |
| Escalación | — | — | Call de emergencia (1 incluida) |

### 5.2 Qué NO es soporte

- Desarrollo custom sobre el template
- Deployment en la infra del cliente
- Debugging de código que el buyer modificó (excepto Enterprise con reviews)
- Formación de equipo (se vende como upsell)
- Integración con servicios terceros no incluidos en el template

---

## 6. UPSELLS

| Upsell | Precio | Target | Momento |
|---|---|---|---|
| Upgrade Indie → Business | $5,000 (diferencial) | Indie que necesita más licencias | Cualquier momento |
| Upgrade Business → Enterprise | $10,100 (diferencial) | Business que necesita soporte | Cualquier momento |
| Onboarding dedicado (2h video) | $1,500 | Indie / Business | Thank-you page |
| Custom theme design | $2,500 | Business | Email día 3 |
| Soporte extendido (+12 meses) | $3,000 | Business / Enterprise | Mes 10 |
| Audit pre-lanzamiento | $2,000 | Business / Enterprise | Cuando avisan que van a producción |
| Training para equipo (4h) | $3,500 | Enterprise | Post-onboarding |
| Módulos adicionales a medida | Presupuesto custom | Enterprise | Bajo demanda |

---

## 7. DESCUENTOS Y PROMOCIONES

### 7.1 Descuentos permitidos

| Tipo | Descuento | Aplica a | Regla |
|---|---|---|---|
| Launch week | 20% | Indie + Business | Solo 7 días, una sola vez |
| PPP (Purchasing Power Parity) | 30-50% | Solo Indie | Automático por país vía checkout |
| Referral | 15% off comprador + 15% comisión referrer | Business | Con código de referido |
| Upgrade | Paga diferencial exacto | Todos | Sin límite temporal |

### 7.2 Descuentos PROHIBIDOS

| Regla | Razón |
|---|---|
| Enterprise nunca se descuenta públicamente | Destruye percepción premium. Negociable caso a caso. |
| Indie nunca baja de $1,900 | Debajo atrae buyer equivocado |
| No Black Friday ni "limited time" permanente | Destruye confianza en el precio real |
| No descuento por volumen en Indie | Si necesita volumen, necesita Business |
| No free tier ni trial de código | El código fuente no se puede "devolver" |

---

## 8. LEGAL

### 8.1 Licencia del producto

| Parámetro | Valor |
|---|---|
| Tipo de licencia | Propietaria (commercial source-available) |
| Licencia del código entregado | MIT para el proyecto final del buyer |
| Licencia del template como template | Propietaria — no redistribuible |
| Jurisdicción | España (o la que defina el vendedor) |
| Arbitraje | Según jurisdicción del vendedor |

### 8.2 Derechos del comprador

- Usar, modificar, y desplegar el código en producción
- Crear productos derivados (su festival, producto de su cliente)
- Mantener una copia privada indefinidamente
- Recibir updates durante el período contratado

### 8.3 Restricciones del comprador

- NO redistribuir el template como template/boilerplate
- NO sublicenciar el código fuente a terceros
- NO publicar el repo como open source
- NO exceder el número de desarrolladores de su tier
- NO reclamar autoría original del template

### 8.4 Garantías y refunds

| Parámetro | Valor |
|---|---|
| Garantía de funcionamiento | 14 días — si no arranca como se describe, refund completo |
| Refund por "no me gusta" | No disponible (es código fuente, no se puede devolver) |
| Refund por defecto técnico | Sí, dentro de 14 días, con evidencia |
| Limitación de responsabilidad | El template se entrega "as is" para desarrollo. No se garantiza uptime, revenue, ni resultados de negocio |
| Indemnización | El buyer es responsable de su deployment, datos de usuarios, y compliance con leyes locales |

---

## 9. MÉTRICAS Y KPIs

### 9.1 Funnel de ventas

| Métrica | Definición | Target |
|---|---|---|
| Visitors → Pricing page | % que llega a sección pricing | >40% |
| Pricing page → Checkout initiated | % que inicia compra | >8% |
| Checkout initiated → Completed | % que completa pago | >60% |
| Overall conversion (visitor → sale) | Visitors to sale | >2% |
| Revenue por venta promedio | Weighted average | $7,900+ |
| Refund rate | Refunds / ventas | <3% |
| Upgrade rate | Indie→Business conversions | >10% en 6 meses |

### 9.2 Health del producto

| Métrica | Definición | Target |
|---|---|---|
| Time to first run | Clone → `pnpm dev` funcional | <10 minutos |
| Setup success rate | % de buyers que completan setup sin soporte | >90% |
| GitHub issues abiertos | Bugs reportados sin resolver | <5 en cualquier momento |
| NPS de compradores | Net Promoter Score | >50 |
| Soporte Enterprise SLA compliance | % respuestas dentro de 72h | >95% |

---

## 10. CONTENIDO DEMO

### 10.1 Datos del seed

| Tabla | Registros | Descripción |
|---|---|---|
| events | 7 | Festivales variados (activo, sold-out, inactivo, pricing TBD) |
| users | 3 | Admin, editor, viewer (RBAC demo) |
| leads | 8 | Leads de distintos eventos con fuentes variadas |
| orders | 10 | Órdenes en distintos estados (completed, pending, refunded, cancelled) |

### 10.2 Escenarios de demo

| Escenario | Qué mostrar | Valor para el buyer |
|---|---|---|
| Setup en vivo | `pnpm setup` → 30 segundos → todo corriendo | "Es real, no marketing" |
| Dashboard admin | Login → ver leads, orders, capacity | "No tienes que construir esto" |
| Checkout flow | Evento → comprar → Stripe Checkout → orden creada | "Pagos funcionan out of the box" |
| White-label | Cambiar 3 env vars → refresh → otra marca | "5 minutos para tu marca" |
| Graceful degradation | Quitar STRIPE_SECRET_KEY → sigue funcionando con links externos | "No te obliga a nada" |
| i18n | Cambiar /es/ → /en/ → todo traducido | "Internacional sin esfuerzo" |
| Sold-out | Evento con capacity = tickets_sold → botón deshabilitado | "El aforo se gestiona solo" |

---

## 11. COMPETITIVE POSITIONING

### 11.1 vs. SaaS de ticketing (Eventbrite, Eventcube, InEvent)

| Aspecto | SaaS de ticketing | Festival Platform |
|---|---|---|
| Coste año 1 | $3,600–$50,000 | $2,900–$18,000 (one-time) |
| Coste año 2+ | Mismo (recurrente) | $0 (código es tuyo) |
| Comisión por ticket | 2-8% | 0% (Stripe directo: 2.9% procesador) |
| Customización | Limitada a su UI/config | Código fuente completo, ilimitada |
| Datos del cliente | En SU plataforma | En TU base de datos |
| Vendor lock-in | Alto | Cero |
| Branding | "Powered by Eventbrite" | Tu marca 100% |
| Tiempo a producción | 1-2 días (config) | 1-2 semanas (customización) |

**Pitch:** "Paga una vez lo que otros cobran cada año. Y eres dueño de todo."

### 11.2 vs. Templates/Boilerplates (ShipFast, Supastarter)

| Aspecto | Templates genéricos ($199-$399) | Festival Platform ($2,900-$18,000) |
|---|---|---|
| Vertical | Genérico ("build your SaaS") | Específico (festival ticketing) |
| Production readiness | Starter kit, tú construyes | Plataforma completa |
| Tests | 0-50 tests | 354+ unit/integration + 7 E2E |
| Seguridad | Auth básica | 11 módulos (CSRF, rate limiting, idempotency, burst, overload) |
| Observabilidad | Ninguna | 9 módulos (tracing, audit, surge prediction, scorecard) |
| Load testing | Ninguno | 7 scripts k6 con SLO thresholds |
| GDPR | Ninguno | Consent, soft delete, audit trail, IP hashing |
| Soporte | Discord/GitHub | Email con SLA (Enterprise) |

**Pitch:** "No es un starter kit. Es lo que tú habrías construido en 2 meses."

---

## 12. ROADMAP PÚBLICO (para trust-building)

### Incluido hoy (v1.0)

- Ticketing con Stripe Checkout
- Admin dashboard con auth + RBAC
- 11 módulos de seguridad
- 9 módulos de observabilidad
- GDPR compliance
- i18n (ES/EN)
- Load testing (k6)
- CI/CD (GitHub Actions)
- E2E tests (Playwright)

### Planificado (v1.x — next 6 months)

| Feature | ETA | Tier mínimo |
|---|---|---|
| Multi-currency support (USD, GBP, MXN) | Q2 2026 | Business |
| Waitlist con notificación automática | Q2 2026 | Business |
| Promo codes / descuentos | Q3 2026 | Business |
| Dashboard analytics (gráficas de revenue) | Q3 2026 | Business |
| Tercer idioma (PT) | Q3 2026 | Indie |
| Export de datos (CSV, JSON) | Q2 2026 | Business |
| Webhook outgoing (Zapier/n8n ready) | Q3 2026 | Enterprise |

### Considerado (v2.0 — requiere validación)

- Mobile app (React Native)
- Multi-tenant (un deploy, N festivales)
- Marketplace de add-ons
- White-label admin theming

---

## 13. CHECKLIST PRE-LANZAMIENTO

| # | Tarea | Estado | Bloquea venta |
|---|---|---|---|
| 1 | Landing page con pricing premium | ⬜ Pendiente | Sí |
| 2 | Demo online desplegada (Vercel) | ⬜ Pendiente | Sí |
| 3 | Repo privado en GitHub para buyers | ⬜ Pendiente | Sí |
| 4 | Checkout configurado (Lemon Squeezy o Stripe) | ⬜ Pendiente | Sí |
| 5 | Email automático post-compra con instrucciones | ⬜ Pendiente | Sí |
| 6 | Formulario de contacto para Enterprise | ⬜ Pendiente | Sí |
| 7 | Términos de licencia redactados | ⬜ Pendiente | Sí |
| 8 | Política de refund publicada | ⬜ Pendiente | Sí |
| 9 | Secuencia de emails post-compra (3 emails) | ⬜ Pendiente | No |
| 10 | Case study / testimonial (al menos 1 real) | ⬜ Pendiente | No |
| 11 | Video walkthrough del setup (2 min) | ⬜ Pendiente | No |
| 12 | SEO: meta tags, OG image, schema.org | ⬜ Pendiente | No |
| 13 | Analytics en landing (Plausible/Fathom) | ⬜ Pendiente | No |
| 14 | GitHub Discussions habilitado | ⬜ Pendiente | No |
| 15 | Dependabot + security alerts activos en repo | ✅ Hecho | — |
