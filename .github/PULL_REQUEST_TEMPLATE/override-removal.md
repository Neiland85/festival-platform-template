## Override Removal / Update

**Override**: `"<package>@<range>": "<target_version>"`
**CVE(s)**: CVE-XXXX-XXXXX
**Acción**: [ ] Eliminación / [ ] Actualización de target

---

### Contexto

- **Por qué se añadió**: (enlace a advisory o SECURITY/OVERRIDES.md)
- **Dependencia transitiva raíz**: (ej: eslint → flat-cache → flatted)
- **Fecha de adición**: YYYY-MM-DD

### Evidencia de que es seguro retirar

```bash
# 1. No quedan versiones vulnerables en el árbol
pnpm why <package>
# Pegar output — todas las versiones deben ser >= target

# 2. Audit limpio
pnpm audit --prod --audit-level=high
# Resultado esperado: 0 vulnerabilities

# 3. Audit dev también
pnpm audit --audit-level=high
# Resultado esperado: 0 vulnerabilities (o solo las documentadas en OVERRIDES.md)
```

### Checklist

- [ ] `pnpm why <package>` confirma que no quedan versiones vulnerables
- [ ] `pnpm install` regenera lockfile sin errores
- [ ] `pnpm audit --prod --audit-level=high` → 0 vulnerabilities
- [ ] `pnpm lint` → sin errores
- [ ] `pnpm typecheck` → sin errores
- [ ] `pnpm test` → todos pasan
- [ ] `pnpm build` → build exitoso
- [ ] Actualizado `SECURITY/OVERRIDES.md` (marcar override como retirado + fecha)
- [ ] Revisado por segundo par de ojos

### Rollback Plan

Si tras mergear aparecen problemas:

```bash
# 1. Revertir el commit
git revert <commit-sha>

# 2. Re-añadir override en package.json > pnpm.overrides
"<package>@<range>": "<target_version>"

# 3. Regenerar lockfile
pnpm install

# 4. Verificar
pnpm audit --prod --audit-level=high
pnpm test
```

### Notas adicionales

(Cualquier contexto relevante: si upstream tiene PR abierto, si hay breaking changes, etc.)
