## CDN Migration — Hero Video Assets

**Objetivo**: Migrar videos hero de `/public/hero/` a S3 + CloudFront para reducir bundle size del deploy y servir con cache inmutable.

---

### Cambios incluidos

- **`scripts/upload-asset-to-s3.sh`** — Script manual para subir assets a S3 con content-type y cache-control correctos.
- **`src/ui/components/HeroVideo.tsx`** — CDN-aware con `NEXT_PUBLIC_CDN_HERO_URL`, fallback a `/hero/`, soporte WebM + MP4.
- **`src/lib/env.ts`** — Nuevo `NEXT_PUBLIC_CDN_HERO_URL` (opcional, `.url()`).
- **`.github/workflows/ci-assets.yml`** — Auto-upload a S3 en push a `main` cuando cambian archivos en `public/hero/`.
- **`.env.example`** — Documentado `NEXT_PUBLIC_CDN_HERO_URL`.

### Configuración requerida

| Variable / Secret | Dónde | Ejemplo |
|---|---|---|
| `S3_BUCKET` | GitHub vars | `festival-platform-assets` |
| `AWS_REGION` | GitHub vars | `eu-west-1` |
| `CDN_DOMAIN` | GitHub vars | `d1abc.cloudfront.net` |
| `AWS_ACCESS_KEY_ID` | GitHub secrets | IAM key con `s3:PutObject` |
| `AWS_SECRET_ACCESS_KEY` | GitHub secrets | IAM secret |
| `CDN_DISTRIBUTION_ID` | GitHub secrets | `E1XXXXX` (para invalidación) |
| `NEXT_PUBLIC_CDN_HERO_URL` | Vercel env vars | `https://d1abc.cloudfront.net/hero/` |

### Checklist

- [ ] S3 bucket creado con block public access deshabilitado (o CloudFront OAI configurado)
- [ ] IAM user/role con política `s3:PutObject` + `s3:GetObject` en el bucket
- [ ] CloudFront distribution apuntando al bucket con origin path `/`
- [ ] Secrets y vars configurados en GitHub repo settings
- [ ] `NEXT_PUBLIC_CDN_HERO_URL` configurado en Vercel (production + preview)
- [ ] Videos subidos manualmente con `scripts/upload-asset-to-s3.sh` para la primera carga
- [ ] Verificado que HeroVideo carga desde CDN en preview deploy
- [ ] Verificado fallback local funciona sin `NEXT_PUBLIC_CDN_HERO_URL`
- [ ] `pnpm build` exitoso
- [ ] `pnpm typecheck` sin errores

### Rollback

**Inmediato (< 1 min):**
```bash
# 1. Quitar la env var en Vercel → videos vuelven a /public/hero/
# Dashboard → Settings → Environment Variables → delete NEXT_PUBLIC_CDN_HERO_URL
# 2. Redeploy
vercel --prod
```

**Completo (revertir código):**
```bash
git revert <merge-commit-sha>
git push origin main
```

### Notas

- Los videos en `/public/hero/` siguen funcionando como fallback. No se eliminan del repo hasta confirmar CDN estable en producción.
- Cache `immutable` + `max-age=31536000` (1 año). Para forzar refresh: cambiar filename (content-hash) o invalidar CloudFront.
- El workflow `ci-assets.yml` solo sube archivos que cambiaron (diff con HEAD~1). Usar `workflow_dispatch` con `force=true` para re-upload completo.
