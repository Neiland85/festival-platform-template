# ADR-002: CMS headless con Sanity y degradación elegante

- **Estado:** Aceptada
- **Fecha:** 2026-02-22
- **Autores:** Equipo de desarrollo

## Contexto

Los festivales necesitan gestionar contenido dinámico (eventos, artistas, sponsors) sin desplegar código. Se necesita un CMS que permita a no-desarrolladores editar contenido, pero que no sea requisito obligatorio para que el template funcione.

## Decisión

Adoptar **next-sanity v12** como CMS headless con **degradación elegante en 3 niveles**:

1. **Sanity disponible** → contenido desde CMS (fuente primaria)
2. **Sanity no configurado, DB disponible** → contenido desde PostgreSQL
3. **Ni Sanity ni DB** → contenido estático desde `src/config/site.ts`

### Alternativas evaluadas

| Opción | Pros | Contras |
|--------|------|---------|
| Sanity | Free tier generoso, GROQ potente, real-time preview | Vendor lock-in en queries GROQ |
| Contentful | Estándar GraphQL | Free tier limitado (25K records), pricing agresivo |
| Strapi | Self-hosted, open source | Requiere infraestructura adicional, no serverless |
| Markdown/MDX | Sin dependencias externas | No apto para editores no técnicos |

### Patrón de degradación

```
getEvents() → trySanity() → tryDatabase() → fallbackConfig()
```

El feature toggle `HAS_SANITY` se activa automáticamente si `NEXT_PUBLIC_SANITY_PROJECT_ID` está configurado.

## Consecuencias

- **Positivas:** Template funciona sin configurar Sanity (zero-config), compradores pueden adoptar CMS gradualmente
- **Negativas:** Tres fuentes de datos requieren orquestación cuidadosa, tipos deben ser compatibles entre fuentes
- **Riesgos:** Drift entre schema Sanity y schema DB — mitigado con tipos TypeScript compartidos en `src/domain/events/`
