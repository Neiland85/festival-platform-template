# ADR-004: Estrategia de degradación elegante

- **Estado:** Aceptada
- **Fecha:** 2026-02-15
- **Autores:** Equipo de desarrollo

## Contexto

Como template SaaS vendido a múltiples compradores con diferentes niveles de infraestructura, el sistema debe funcionar desde la configuración más simple (solo Next.js) hasta la más completa (con CMS, pagos, analytics, caching distribuido). Forzar todas las integraciones reduce el mercado potencial.

## Decisión

Adoptar **degradación elegante como principio arquitectónico central**. Todas las integraciones externas son opcionales y el template funciona con fallbacks progresivos.

### Matriz de degradación

| Servicio | Variable de entorno | Con servicio | Sin servicio |
|----------|-------------------|-------------|-------------|
| Sanity CMS | `NEXT_PUBLIC_SANITY_PROJECT_ID` | Contenido desde CMS | DB → config estática |
| Stripe | `STRIPE_SECRET_KEY` | Checkout funcional | "Coming Soon" |
| Redis | `UPSTASH_REDIS_REST_URL` | Rate limit distribuido | Rate limit en memoria |
| Sentry | `SENTRY_DSN` | Error tracking | `console.error` |
| Google Analytics | `NEXT_PUBLIC_GA_ID` | Analytics completos | Sin tracking |
| Meta Pixel | `NEXT_PUBLIC_FB_PIXEL_ID` | Retargeting | Sin pixel |

### Implementación

- Feature toggles derivados en `src/config/site.ts` (ej: `HAS_STRIPE = !!process.env["STRIPE_SECRET_KEY"]`)
- Patrón try/catch con fallback en adapters
- Endpoints devuelven 503 (no 500) cuando un servicio opcional no está configurado
- UI condicional basada en feature toggles (no errores en runtime)

### Principios

1. **Zero-config funcional:** `pnpm dev` debe funcionar sin ninguna variable de entorno
2. **Adopción progresiva:** El comprador añade integraciones a su ritmo
3. **Fail-safe > fail-fast:** Para servicios opcionales, degradar silenciosamente
4. **503 sobre 500:** Distinguir "no configurado" de "error real"

## Consecuencias

- **Positivas:** Barrera de entrada mínima, cada comprador configura solo lo que necesita, testing simplificado (no requiere servicios externos)
- **Negativas:** Más código condicional, complejidad en testing (probar cada nivel de degradación)
- **Riesgos:** El comprador puede no descubrir features opcionales — mitigado con documentación y logs informativos al iniciar
