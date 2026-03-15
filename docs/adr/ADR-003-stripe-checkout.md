# ADR-003: Pagos con Stripe Checkout

- **Estado:** Aceptada
- **Fecha:** 2026-03-01
- **Autores:** Equipo de desarrollo

## Contexto

El template necesita venta de entradas online. La solución de pagos debe ser segura (PCI DSS), soportar múltiples monedas, y ser opcional para compradores del template que aún no necesiten pagos.

## Decisión

Adoptar **Stripe Checkout (hosted)** con el SDK v20 y API version `2026-02-25.clover`. Implementar como módulo opcional con degradación a "Coming Soon".

### Alternativas evaluadas

| Opción | Pros | Contras |
|--------|------|---------|
| Stripe Checkout (hosted) | PCI compliant sin esfuerzo, UX optimizada por Stripe | Menos control sobre UI |
| Stripe Elements (embedded) | Control total del formulario | Requiere más código, PCI SAQ-A-EP |
| PayPal | Amplia adopción | API menos developer-friendly, fees más altos en EU |
| Square | Buena API | Menor presencia en Europa |

### Arquitectura

```
Frontend → POST /api/v1/checkout → createOrder() → createCheckoutSession() → redirect
                                                                              ↓
Stripe webhook → POST /api/v1/webhooks/stripe → completeOrder() → update DB
```

- **Domain layer:** `src/domain/orders/` (create-order, complete-order)
- **Adapter layer:** `src/adapters/payments/stripe/` (client, checkout, webhooks)
- **Security:** CSRF + rate limiting en endpoint checkout, signature verification en webhooks

### Degradación

Si `STRIPE_SECRET_KEY` no está configurado:
- Endpoint checkout devuelve 503 con mensaje descriptivo
- UI muestra "Coming Soon" en lugar de botón de compra
- Feature toggle: `HAS_STRIPE` en `src/config/site.ts`

## Consecuencias

- **Positivas:** Zero PCI scope para el comprador del template, Stripe maneja 3D Secure/SCA automáticamente
- **Negativas:** Dependencia en Stripe para checkout UI, comisión por transacción
- **Riesgos:** Webhook reliability — mitigado con idempotency keys y estado de orden en DB
