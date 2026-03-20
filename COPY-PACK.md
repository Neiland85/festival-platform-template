# Copy Pack — Festival Platform Template

## 1. HOOKS PARA TWITTER/X

### H1 — El de coste de oportunidad
Cada semana que tu equipo pasa construyendo infraestructura de ticketing es una semana que no está vendiendo entradas.

Nosotros tardamos 12,171 líneas y 354 tests en llegar aquí.

Tu setup tarda 30 segundos.

### H2 — El provocador
"Vamos a construir nuestro propio sistema de ticketing."

— Alguien que va a gastar $18K y 2 meses reinventando lo que ya existe con 11 módulos de seguridad, 9 de observabilidad y un pipeline de CI/CD que ellos nunca van a escribir.

### H3 — El de datos duros
Números reales de nuestro template de festival:

128 archivos fuente
354 tests
29 API endpoints
11 módulos de seguridad
9 de observabilidad
7 scripts de load testing

Tiempo de setup: 30 segundos.
Tiempo de construirlo tú: 6-8 semanas.

### H4 — El anti-SaaS
Eventbrite te cobra comisión por cada ticket que vendes. Cada año. Para siempre.

Nosotros te vendemos el código fuente una vez. Stripe cobra su 2.9% de procesador. El resto es tuyo. Año dos: $0.

¿En qué momento deja de tener sentido alquilar tu plataforma?

### H5 — El de la demo en vivo
Acabo de hacer clone → install → setup → dev.

30 segundos. PostgreSQL corriendo, schema desplegado, 7 eventos demo, dashboard admin con auth, Stripe listo para conectar.

No es un starter kit con TODOs. Es lo que tú habrías construido en 2 meses si tuvieras tiempo infinito y cero bugs.

### H6 — El de seguridad
Tu sistema de ticketing casero probablemente no tiene:

— CSRF protection
— Rate limiting con fallback
— Idempotencia en pagos
— Burst queue para picos
— Overload protection
— IP hashing (GDPR)
— Chaos testing

El nuestro tiene los 7. Con tests.

Cuando 10,000 personas compren a la vez el día de la venta flash, vas a agradecer cada uno.

### H7 — El contrarian
Hot take: la mayoría de "templates premium" de Next.js son carpetas bonitas con TODOs dentro.

Un template de verdad tiene tests que pasan, seguridad que funciona, y un `pnpm setup` que no te deja tirado a las 3AM.

Eso o es una carpeta con aspiraciones.

### H8 — El de la agencia (ROI directo)
Si eres agencia:

Proyecto típico festival:
— precio: €10K–€20K
— tiempo: 6–8 semanas

Con este template:
— entrega en 3–5 días
— mismo precio
— 80–90% margen

No vendes menos. Simplemente dejas de perder tiempo.

El rate efectivo pasa de €375/día a €3,000/día. Mismo cliente. Mismo presupuesto. 8x más rentable.

### H9 — El de la comparación brutal
Construir desde cero:
— 240-320 horas
— $18K-$24K
— 0 tests
— 0 load testing
— 0 GDPR compliance

Comprar el template:
— 30 segundos
— Fracción del coste
— 354 tests + 7 E2E
— 7 scripts k6
— GDPR completo

Elige tu aventura.

### H10 — El filosófico
Hay dos tipos de developer:

1. El que pasa 2 meses construyendo rate limiting, CSRF, idempotencia y un dashboard admin para poder vender entradas de un festival.

2. El que vende entradas del festival.

Nuestro template convierte al primero en el segundo en 30 segundos.

### H11 — El psicológico (reframe del problema real)
La parte difícil no es hacer una web de festival.

Es:
— gestionar pagos sin duplicados
— evitar caídas en picos de tráfico
— cumplir GDPR
— tener un admin usable
— no romper todo en producción

Eso es lo que ya está resuelto aquí.

### H12 — El del dinero (ROI explícito)
Un festival de 2,000 asistentes vendiendo tickets de €40:

€80,000 en ingresos.

Eventbrite:
— ~5% comisión → €4,000 perdidos

Nuestro template + Stripe directo:
— ~2.9% procesador → €2,320
— El resto es tuyo

Diferencia en UN evento: €1,680.
En 3 eventos ya has pagado el template.
En 10 eventos has ahorrado más de lo que costó construirlo desde cero.

La pregunta no es si puedes permitírtelo. Es cuánto estás perdiendo cada mes que sigues en Eventbrite.

---

## 2. TAGLINES

### T1 — Resultado puro
**Tu plataforma de festival. Esta semana.**

### T2 — Anti-SaaS
**Deja de alquilar tu ticketing. Sé dueño.**

### T3 — Tiempo
**6 semanas de código. 30 segundos de setup.**

### T4 — Provocador
**No es un starter kit. Es lo que habrías construido en 2 meses.**

### T5 — Builder
**Construido para producción. Vendido para que no tengas que construirlo.**

### T6 — Killer (resultado + urgencia)
**Vende entradas esta semana. No dentro de 2 meses.**

### T7 — Anti-comisiones (dinero + velocidad)
**Ticketing propio en 30 segundos. Sin comisiones.**

---

## 3. DESCRIPCIONES TIPO MARKETPLACE

### D1 — Versión completa (Gumroad/Lemon Squeezy main description)

**Festival Platform — white-label ticketing platform, not a starter kit.**

Lanza tu plataforma de festival con venta de entradas en menos de 30 minutos.

Sin construir backend. Sin integrar pagos. Sin meses de desarrollo.

Este template incluye todo lo necesario para pasar de idea a ventas reales: ticketing, dashboard admin, pagos, seguridad y observabilidad — listo para producción desde el primer día.

Qué incluye: 128 archivos TypeScript de producción. 29 API endpoints. Dashboard admin con auth y RBAC. Stripe Checkout con webhooks, órdenes y control de aforo. 11 módulos de seguridad (CSRF, rate limiting, idempotencia, burst queue, overload). 9 módulos de observabilidad (tracing, audit log, predicción de picos, scorecard). GDPR compliance (consent, soft deletes, IP hashing, audit trail). Tests: 354 unit/integration + 7 E2E con Playwright. 7 scripts k6 de load testing. CI/CD con GitHub Actions. i18n español/inglés.

Setup: `pnpm install && pnpm setup && pnpm dev`. 30 segundos. PostgreSQL en Docker, schema desplegado, datos demo, dashboard corriendo.

Pago único. Sin suscripción. Sin comisión por ticket. El código es tuyo.

### D2 — Versión corta (Product Hunt, directories)

**Plataforma white-label de festival con ticketing, dashboard admin y Stripe. Next.js 16, TypeScript, PostgreSQL. 128 archivos de producción, 354+ tests, 11 módulos de seguridad, 9 de observabilidad. Setup en 30 segundos. Pago único — no SaaS, no comisiones.**

### D3 — Versión one-liner (Twitter bio, badges, referral)

**Plataforma de ticketing para festivales. Next.js + Stripe + PostgreSQL. Production-ready. Pago único.**
