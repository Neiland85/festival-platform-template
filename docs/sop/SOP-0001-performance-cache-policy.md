# Performance & Cache Policy

## Objetivo
Reducir carga en runtime y mejorar TTFB mediante estrategia Edge-first.

## Política aplicada
- HTML: s-maxage=86400 + stale-while-revalidate
- API: no-store
- Static assets: immutable

## Resultado esperado
- CDN absorbe la mayoría del tráfico
- Backend no es cuello de botella
