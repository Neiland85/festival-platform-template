# pnpm Overrides — Registro de Seguridad

> Documento vivo. Cada override en `package.json > pnpm.overrides` debe tener
> una entrada aquí explicando por qué existe, cuándo puede retirarse y qué
> riesgo residual queda mientras esté activo.

Última revisión: 2026-03-22

---

## Índice

| # | Paquete | Override | Severidad | Tipo |
|---|---------|----------|-----------|------|
| 1 | minimatch | `<3.1.4` → `3.1.4` | HIGH | ReDoS |
| 2 | minimatch | `>=9.0.0 <9.0.7` → `9.0.7` | HIGH | ReDoS |
| 3 | ajv | `<6.14.0` → `6.14.0` | MEDIUM | ReDoS |
| 4 | serialize-javascript | `<=7.0.2` → `7.0.3` | HIGH | Code Injection |
| 5 | esbuild | `<=0.24.2` → `0.25.0` | MODERATE | CORS / Info Disclosure |
| 6 | js-yaml | `<3.14.2` → `3.14.2` | MEDIUM | Prototype Pollution |
| 7 | flatted | `<3.4.2` → `3.4.2` | HIGH | Prototype Pollution + DoS |

---

## 1. minimatch `<3.1.4` → `3.1.4`

**CVE**: CVE-2026-26996
**Severidad**: HIGH
**Tipo**: Regular Expression Denial of Service (ReDoS)

**Descripción**: Patrones con extglobs anidados (`*()`) generan expresiones
regulares con cuantificadores no acotados, causando backtracking catastrófico.
Un patrón de 12 bytes con input de 18 bytes no-matching bloquea `minimatch()`
durante >7 segundos.

**Dependencias transitivas afectadas**: webpack, webpack-cli,
fork-ts-checker-webpack-plugin, y herramientas de build que usan glob matching.

**Riesgo residual**: Bajo. El override fuerza la versión parcheada. El riesgo
real es que minimatch 3.x es legacy — la mayoría de dependencias upstream migran
a minimatch 9.x o alternativas como picomatch.

**Plan de mitigación**:
1. Monitorear si las dependencias directas actualizan a minimatch >=3.1.4 nativo.
2. Cuando no queden dependencias transitivas pidiendo `<3.1.4`, eliminar override.
3. Verificar con: `pnpm why minimatch` — si todas las versiones son >=3.1.4, retirar.

---

## 2. minimatch `>=9.0.0 <9.0.7` → `9.0.7`

**CVE**: CVE-2026-26996, CVE-2026-27903
**Severidad**: HIGH
**Tipo**: ReDoS + Unbounded Recursive Backtracking

**Descripción**: Dos vectores:
- Misma vulnerabilidad de extglobs anidados que en 3.x.
- `matchOne()` realiza backtracking recursivo no acotado con múltiples segmentos
  `**` (GLOBSTAR) no adyacentes: complejidad O(4^N).

**Dependencias transitivas**: glob, build tools internos.

**Riesgo residual**: Bajo. La rama 9.x recibe mantenimiento activo.

**Plan de mitigación**:
1. Verificar con `pnpm why minimatch` si todas las 9.x son >=9.0.7.
2. Retirar override cuando upstream absorba el parche.

---

## 3. ajv `<6.14.0` → `6.14.0`

**CVE**: CVE-2025-69873
**Severidad**: MEDIUM (LOW en contexto dev-only)
**Tipo**: ReDoS vía `$data`

**Descripción**: Cuando se usa la opción `$data`, el keyword `pattern` acepta
datos runtime vía JSON Pointer sin validar, permitiendo pasar patrones regex
maliciosos al constructor `RegExp()`.

**Dependencias transitivas**: eslint, schema validators, API validation frameworks.
ajv tiene 170M+ descargas semanales — prácticamente toda la cadena de tooling JS
depende de alguna versión.

**Riesgo residual**: Muy bajo. En este proyecto ajv se usa solo en contexto de
build/lint, no en runtime de producción. No se usa `$data`.

**Plan de mitigación**:
1. El override se puede retirar cuando eslint y plugins actualicen a ajv >=6.14.0.
2. Verificar: `pnpm why ajv` — buscar versiones <6.14.0.

---

## 4. serialize-javascript `<=7.0.2` → `7.0.3`

**CVE**: GHSA-5c6j-r48x-rmvq (fix incompleto de CVE-2020-7660)
**Severidad**: HIGH (CVSS 8.1)
**Tipo**: Code Injection / Remote Code Execution

**Descripción**: `RegExp.flags` y `Date.prototype.toISOString()` se interpolan
sin escapar en la salida serializada. Aunque `RegExp.source` está sanitizado,
`RegExp.flags` se incluye directamente, habilitando inyección de código cuando
la salida serializada se evalúa.

**Dependencias transitivas**: terser-webpack-plugin, compression-webpack-plugin,
css-minimizer-webpack-plugin, copy-webpack-plugin, react-scripts.

**Riesgo residual**: Medio. Aunque es dev-only (build tooling), si algún plugin
de webpack serializa input del usuario durante build, podría haber RCE en CI.

**Plan de mitigación**:
1. Crítico: verificar que ningún path de producción use serialize-javascript.
2. Retirar cuando terser-webpack-plugin actualice su dependencia.
3. Verificar: `pnpm why serialize-javascript`.

---

## 5. esbuild `<=0.24.2` → `0.25.0`

**CVE**: CVE-2024-23334 (GHSA-67mh-4wv8-2f99)
**Severidad**: MODERATE
**Tipo**: CORS / Information Disclosure

**Descripción**: Configuración CORS excesivamente permisiva en el servidor de
desarrollo permite que cualquier sitio web envíe requests al dev server y lea
las respuestas, exponiendo potencialmente código fuente y datos sensibles.

**Dependencias transitivas**: Vite (directa), Angular, herramientas de build
(5,801 dependientes).

**Riesgo residual**: Bajo. Solo afecta al dev server local. No impacta
producción. El riesgo real es en entornos de desarrollo compartidos o cuando
el dev server es accesible desde la red.

**Plan de mitigación**:
1. Override temporal hasta que Vite/Next.js actualicen esbuild transitivamente.
2. Verificar: `pnpm why esbuild` — cuando todas las versiones sean >=0.25.0, retirar.
3. Mientras tanto, no exponer dev server a la red.

---

## 6. js-yaml `<3.14.2` → `3.14.2`

**CVE**: CVE-2025-64718
**Severidad**: MEDIUM
**Tipo**: Prototype Pollution

**Descripción**: `parse()` permite modificación de prototipos de objetos vía
la propiedad `__proto__` en documentos YAML. Un atacante puede suministrar YAML
crafteado con `__proto__` para alterar la cadena de prototipos.

**Dependencias transitivas**: Docker compose tools, configuration loaders,
herramientas de infraestructura DevOps.

**Riesgo residual**: Bajo. En este proyecto js-yaml se usa solo en tooling
(config files estáticos). No se parsea YAML de fuentes no confiables en runtime.

**Plan de mitigación**:
1. La rama 3.x es legacy; la versión activa es 4.x.
2. Retirar override cuando las dependencias transitivas migren a js-yaml 4.x.
3. Verificar: `pnpm why js-yaml` — identificar quién aún pide 3.x.

---

## 7. flatted `<3.4.2` → `3.4.2`

**CVE**: CVE-2026-33228, CVE-2026-32141
**Severidad**: HIGH
**Tipo**: Prototype Pollution + Unbounded Recursion DoS

**Descripción**:
- **CVE-2026-33228** (Prototype Pollution): `parse()` usa claves de índice de
  array no numéricas como índices directos sin validar, creando referencias vivas
  a `Array.prototype`.
- **CVE-2026-32141** (DoS): La fase `revive()` recursiva no tiene límite de
  profundidad; payloads con índices `$` profundamente anidados o
  auto-referenciales causan stack overflow.

**Dependencias transitivas**: eslint → file-entry-cache → flat-cache → flatted.
80M+ descargas semanales.

**Riesgo residual**: Muy bajo. Dev-only (parte de la cadena de eslint). No se
usa flatted en código de producción.

**Plan de mitigación**:
1. Añadido en este PR (2026-03-22).
2. Retirar cuando eslint/flat-cache actualice flatted a >=3.4.2.
3. Verificar: `pnpm why flatted`.

---

## Proceso de Revisión

**Frecuencia**: Mensual o tras cada `pnpm audit` con hallazgos.

**Checklist de revisión**:
1. Ejecutar `pnpm why <paquete>` para cada override.
2. Si no hay versiones vulnerables en el árbol → retirar override.
3. Ejecutar `pnpm audit --prod --audit-level=high` → debe dar 0.
4. Ejecutar `pnpm install` → lockfile se regenera.
5. Ejecutar `pnpm test` → todos los tests pasan.
6. Actualizar este documento con la fecha de revisión.
