# ADR-001: Internacionalización con next-intl

- **Estado:** Aceptada
- **Fecha:** 2026-02-15
- **Autores:** Equipo de desarrollo

## Contexto

El template necesita soporte multiidioma para maximizar el mercado potencial (festivales en España, Latinoamérica, Europa). Se requiere una solución que funcione con Next.js App Router y permita rutas localizadas.

## Decisión

Adoptar **next-intl v4.x** con route groups `[locale]` para ES/EN.

### Alternativas evaluadas

| Opción | Pros | Contras |
|--------|------|---------|
| next-intl | API declarativa, soporte App Router nativo, middleware routing | Dependencia adicional |
| next-i18next | Ecosistema maduro | Diseñado para Pages Router, adaptación forzada a App Router |
| react-intl | Estándar ICU | Sin integración con routing de Next.js |
| i18n manual | Sin dependencias | Esfuerzo alto, sin middleware routing |

### Detalles de implementación

- Middleware reescribe rutas según `Accept-Language` o cookie
- Archivos de traducción en `messages/{locale}.json`
- Locale por defecto: `es` (mercado primario España)
- Locale secundario: `en` (mercado internacional)
- Server Components usan `getTranslations()` directamente
- Client Components usan `useTranslations()` hook

## Consecuencias

- **Positivas:** Rutas SEO-friendly (`/es/eventos`, `/en/events`), extensible a más idiomas sin refactor
- **Negativas:** Complejidad adicional en routing, todos los textos deben pasar por sistema de traducción
- **Riesgos:** Traducciones incompletas degradan UX — mitigado con fallback al locale por defecto
