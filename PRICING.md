# Pricing Strategy v2 — Festival Platform Template

## Por qué la v1 estaba mal

La v1 copiaba el modelo ShipFast ($99/$199/$499). Ese modelo funciona para **starter kits genéricos** que compiten en volumen. Pero este producto no es un starter kit:

| Lo que vende ShipFast ($199) | Lo que vende Festival Platform |
|---|---|
| Auth + Stripe + landing page | Auth + Stripe + dashboard + RBAC + GDPR + observabilidad + seguridad + load testing + CI/CD |
| ~30 archivos, ~0 tests | 155 archivos TS, 998+ tests |
| Genérico: "build your SaaS" | Vertical: plataforma de festival con ticketing completo |
| Starter kit: tú construyes el resto | Plataforma: ya está construida |
| Compite con 50 boilerplates | Compite con SaaS de ticketing ($5K-50K/año) |

**El error:** posicionar un producto de $15-20K de valor de desarrollo como un template de $199 destruye la percepción de valor y atrae al buyer equivocado (el que quiere algo gratis, no el que necesita resolver un problema de negocio).

---

## Nuevo posicionamiento

NO es un "template" o "boilerplate". Es una **plataforma white-label de ticketing para festivales** vendida como licencia de código fuente.

**Competencia real** (no ShipFast):

| Competidor | Modelo | Coste anual |
|---|---|---|
| Eventbrite | SaaS + comisión por ticket | $2,000-$20,000+/año (depende del volumen) |
| Eventcube | White-label SaaS | $3,600-$12,000/año |
| Ticketor | White-label reseller | $1,200-$6,000/año |
| InEvent | Enterprise white-label | $15,000-$50,000/año |
| Cvent | Enterprise | $25,000+/año |

**La diferencia:** todos son SaaS con pagos recurrentes. Tú vendes la licencia del código una vez. Eso es el pitch: "paga una vez lo que otros cobran cada año, y además eres dueño del código."

---

## Nuevo pricing: 3 tiers

```
┌───────────────────┬──────────────────────────┬──────────────────────────┐
│   INDIE             │   BUSINESS ← target      │   ENTERPRISE             │
│   $2,900             │   $7,900                  │   $18,000                 │
│   one-time          │   one-time                │   one-time               │
│                     │                           │                          │
│   1 dev             │   Equipo (hasta 5)        │   Equipo ilimitado       │
│   1 festival        │   Festivales ilimitados   │   + soporte + onboarding │
└───────────────────┴──────────────────────────┴──────────────────────────┘
```

---

### Tier 1: Indie — $2,900

**Buyer:** Indie hacker o dev freelance que va a lanzar UN festival propio. Tiene presupuesto limitado pero sabe que construir desde cero le costaría $15K+ y 2 meses.

**Incluye:**

- Código fuente completo (155+ archivos TypeScript)
- Stripe Checkout integration
- Admin dashboard con auth
- i18n (ES/EN)
- Docker Compose + setup automático
- Documentación completa
- 12 meses de updates
- Licencia: 1 desarrollador, 1 proyecto

**No incluye:**

- Tests (998+ tests solo en Business/Enterprise)
- Módulos de seguridad avanzada (rate limiting, burst queue, chaos monkey)
- Módulos de observabilidad (tracing, surge prediction, scorecard)
- Load testing scripts
- CI/CD pipeline
- Soporte

**Psicología del precio:**
$2,900 es el "no tengo que pensarlo con nadie" para un freelancer que cobra $75/hr. Son 38 horas de su tiempo. Si el template le ahorra 240+ horas, el ROI es 6x. Y $2,900 es una fracción de lo que Eventcube cobra *cada año*.

---

### Tier 2: Business — $7,900 ← Tier objetivo (60-70% de ingresos)

**Buyer:** Agencia de desarrollo, productora de eventos, o startup que hará múltiples festivales. Necesita el pack completo y va a trabajar en equipo.

**Incluye todo lo de Indie, más:**

- 998+ tests (unit, integration, E2E con Playwright)
- 11 módulos de seguridad (CSRF, rate limiting, idempotency, burst queue, overload, chaos monkey)
- 9 módulos de observabilidad (tracing, audit log, surge prediction, safety scorecard)
- 6 scripts k6 de load testing con SLOs
- CI/CD pipeline (GitHub Actions)
- GDPR compliance kit completo
- Licencia: hasta 5 desarrolladores, proyectos ilimitados
- Uso para proyectos de clientes (sin redistribuir template)
- 12 meses de updates + acceso anticipado a features

**Psicología del precio:**
$7,900 parece mucho hasta que haces la cuenta: una agencia que cobra $15K por entregar un festival a un cliente, y lo entrega en 1 semana en vez de 8, tiene un margen bruto de ~$13K en el primer proyecto. El template se paga solo en la primera entrega. A partir del segundo cliente, todo es margen puro.

Contra Eventcube ($3,600-$12,000/año), $7,900 one-time se amortiza en año 1-2 y después es gratis para siempre. Contra Eventbrite (comisión por ticket), un festival de 10,000 tickets a $85 genera ~$50K en comisiones evitadas a lo largo de los años.

---

### Tier 3: Enterprise — $18,000

**Buyer:** Empresa de eventos, grupo de festivales, o empresa tech que necesita una plataforma propia con soporte real y onboarding.

**Incluye todo lo de Business, más:**

- Licencia: desarrolladores ilimitados
- 1 sesión de onboarding por video (60 min) con el creador
- Soporte prioritario por email (72h SLA, 12 meses)
- Revisión de código de customizaciones (hasta 2 reviews)
- Acceso a roadmap privado + feature requests con prioridad
- Branding del template completamente removido (sin "powered by")
- Contrato de licencia personalizado si lo requieren legal/procurement

**Psicología del precio:**
$18,000 existe por tres razones:

1. **Anclaje:** Hace que $7,900 parezca razonable ("es menos de la mitad del enterprise")
2. **Señal de seriedad:** Una empresa que ve un tier de $18K asume que el producto es robusto. Un tier máximo de $499 grita "side project"
3. **Revenue por cliente:** Los pocos que compran Enterprise (~10-15% de clientes) generan ~35% del revenue total

$18,000 es exactamente el coste de construir esto desde cero con un dev mid-level durante 6-8 semanas. El buyer de Enterprise no compra código — compra **tiempo + certeza + soporte**. Y $18K one-time vs $25K+/año de Cvent o InEvent es una fracción del coste lifecycle.

---

## Anclaje visual en la landing

```
                    ┌─ ESTO ES LO QUE VE EL BUYER ─┐

  "Construir desde       Indie        ★ Business        Enterprise
   cero cuesta          $2,900          $7,900           $18,000
   $18,000-$24,000"        │               │                │
        │                  │               │                │
        ▼                  ▼               ▼                ▼
   [ANCLA MÁXIMA]    [ENTRADA]    [CONVERSIÓN]     [ANCLA PRECIO]

   El buyer lee $18-24K → ve $7,900 → siente que ahorra 60%
   El $18K enterprise confirma que $7,900 es el "deal inteligente"
```

---

## Proyección de ingresos

**Escenario conservador:** 8 ventas/mes (producto de nicho premium, no volumen)

| Tier | % ventas | Unidades/mes | Ingreso/mes |
|---|---|---|---|
| Indie | 30% | 2.4 | $6,960 |
| Business | 55% | 4.4 | $34,760 |
| Enterprise | 15% | 1.2 | $21,600 |
| **Total** | | **8** | **$63,320/mes** |

**Revenue promedio por venta: $7,915**

Comparado con la v1 (100 ventas/mes a $203 promedio = $20,300/mes), la v2 genera 3x más revenue con 12x menos clientes. Menos soporte, menos refunds, mejores compradores.

---

## Upsells premium

| Upsell | Precio | Buyer |
|---|---|---|
| **Onboarding dedicado** (2h video, setup en tu infra) | $1,500 | Indie/Business |
| **Custom theme** (diseño personalizado para tu festival) | $2,500 | Business |
| **Extensión Indie→Business** (upgrade de licencia) | $5,000 (precio diferencial) | Indie que creció |
| **Soporte extendido** (12 meses adicionales) | $3,000 | Business/Enterprise |
| **Audit de producción** (revisión pre-lanzamiento de su deployment) | $2,000 | Business/Enterprise |

---

## Licencias

| Aspecto | Indie | Business | Enterprise |
|---|---|---|---|
| Desarrolladores | 1 | 5 | Ilimitados |
| Proyectos | 1 | Ilimitados | Ilimitados |
| Uso para clientes | No | Sí | Sí |
| Redistribuir template | No | No | No |
| Modificar código | Sí | Sí | Sí |
| Remover branding | No | Sí | Sí |
| Soporte | Docs only | Docs + GitHub Discussions | Email prioritario (72h SLA) |
| Updates | 12 meses | 12 meses + early access | 12 meses + early access |

---

## Plataforma de venta

A este precio, **no Gumroad**. Gumroad señala "producto digital barato."

| Plataforma | Cuándo |
|---|---|
| **Lemon Squeezy** | Lanzamiento (tax compliance EU, license keys, checkout profesional) |
| **Stripe directo + portal propio** | Cuando superes $20K/mes (máximo control, mínima comisión) |
| **Paddle** | Si el volumen de EU justifica un Merchant of Record completo |

Para Enterprise ($18K), el checkout estándar no funciona. Se necesita un flujo de contacto: formulario → call → propuesta → factura/PO. Esto es estándar en enterprise y justifica el precio.

---

## Descuentos (con cuidado)

| Tipo | Descuento | Regla |
|---|---|---|
| Launch week | 20% off Indie y Business (NO Enterprise) | Solo 7 días, una vez |
| PPP (Purchasing Power Parity) | 30-50% en países elegibles | Solo tier Indie |
| Referral | 15% off para el referido, 15% comisión para el referrer | Business/Enterprise |
| Upgrade Indie→Business | Paga solo la diferencia ($5,000) | Sin límite de tiempo |

**Reglas inviolables:**
- Enterprise NUNCA se descuenta públicamente (negocia caso por caso)
- Indie nunca baja de $1,900 (debajo de eso atrae al buyer equivocado)
- No Black Friday, no "limited time offer" permanente — destruye confianza en el precio

---

## Lo que cambia en la landing page

1. **Eliminar** toda referencia a "$149" o "$199"
2. **Reemplazar** "Get the Template" por "Get the Platform" o "License the Platform"
3. **Sección pricing** con 3 tarjetas comparativas al nuevo precio
4. **Enterprise CTA:** "Contact us" en vez de botón de compra
5. **Añadir** logos de "trusted by" o "built for" (aunque sea "Built for festivals of 1,000 to 50,000 attendees")
6. **Añadir** sección "Compare to alternatives" con tabla vs Eventbrite/Eventcube/InEvent

---

## Decisión clave pendiente

¿Vender en mercado abierto (landing page pública) o por outreach directo a agencias y productoras de eventos?

- **Landing pública:** Más volumen en Indie, requiere marketing de contenido y SEO
- **Outreach directo:** Más conversión en Business/Enterprise, requiere sales process (emails, calls, demos)
- **Recomendación:** Ambos. Landing para Indie (self-serve), outreach para Business/Enterprise (sales-assisted)
