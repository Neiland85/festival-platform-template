# PR Templates — 5 Critical Changes

---

## 1. Rotate Secrets

### PR Title
```
security(secrets): rotate CSRF_SECRET and IP_HASH_SALT in production
```

### PR Body
```markdown
## Problem

Production environment is using default dev-time values for `CSRF_SECRET` and `IP_HASH_SALT`.
The env validation in `src/lib/env.ts` emits warnings at boot:
- "CSRF_SECRET is using the default dev value in production!"
- "IP_HASH_SALT is using the default dev value in production!"

This exposes the application to CSRF forgery and IP de-anonymization attacks.

## Solution

- Generate cryptographically secure values via `openssl rand -base64 32`
- Set `CSRF_SECRET` and `IP_HASH_SALT` in Vercel production + preview environments
- Add `.env.production.example` documenting required secrets
- Verify env validation passes without warnings on next deploy

## Steps for QA

1. Deploy to preview branch
2. Check Vercel runtime logs — no "default dev value" warnings
3. Submit the promo form → verify CSRF token validates
4. Check audit log → verify IP addresses are hashed (not plaintext)
5. Attempt CSRF replay attack with stale token → expect 403

## Risks

- **Session invalidation**: Rotating `CSRF_SECRET` invalidates all in-flight forms.
  Mitigation: deploy during low-traffic window (< 50 active sessions).
- **IP hash mismatch**: Changing `IP_HASH_SALT` means existing hashed IPs in the DB
  won't match new hashes. Acceptable: hashed IPs are for analytics, not auth.

## Rollback plan

1. Revert env vars in Vercel dashboard to previous values
2. Trigger redeploy: `vercel --prod`
3. No code changes needed — the app reads secrets from env at runtime

## Reviewers

- @Neiland85 (security owner)
```

### Commands
```bash
git checkout -b security/rotate-secrets
# ... make changes ...
git commit -m "security(secrets): rotate CSRF_SECRET and IP_HASH_SALT

Generate production-grade secrets via openssl rand -base64 32.
Remove default dev values from production environment.

Closes #XX"
git push -u origin security/rotate-secrets
gh pr create \
  --title "security(secrets): rotate CSRF_SECRET and IP_HASH_SALT in production" \
  --body-file docs/pr-body-rotate-secrets.md \
  --label "security"
```

---

## 2. Audit Fixes

### PR Title
```
fix(deps): resolve high-severity audit findings in production dependencies
```

### PR Body
```markdown
## Problem

`pnpm audit --prod --audit-level=high` reports N high-severity vulnerabilities
in production dependencies. CI `audit` step is failing/warning.

## Solution

- Update affected packages to patched versions
- Add `pnpm.overrides` with expiry comments for packages without upstream fixes
- Verify no breaking API changes in updated dependencies
- Re-run `pnpm audit --prod --audit-level=high` → 0 findings

## Steps for QA

1. `pnpm install && pnpm audit --prod --audit-level=high` → clean
2. `pnpm verify` → all checks pass (lint, typecheck, test, build)
3. `pnpm test:e2e` → E2E suite passes
4. Verify no runtime regressions on preview deploy
5. Check `pnpm.overrides` entries have expiry dates in comments

## Risks

- **Transitive dependency breakage**: Updated packages may change behavior
  of transitive deps. Mitigation: full E2E suite + manual smoke test.
- **Override staleness**: `pnpm.overrides` entries can become stale.
  Mitigation: expiry date comments + Dependabot will still flag updates.

## Rollback plan

1. `git revert <merge-sha>`
2. `pnpm install` to restore previous lockfile
3. Push and deploy

## Reviewers

- @Neiland85 (maintainer)
```

### Commands
```bash
git checkout -b fix/audit-findings
pnpm update --latest <affected-packages>
pnpm audit --prod --audit-level=high
pnpm verify
git add pnpm-lock.yaml package.json
git commit -m "fix(deps): resolve high-severity audit findings

Update <package> from X.Y.Z to A.B.C (CVE-XXXX-XXXXX).
Add pnpm.overrides for <package> pending upstream fix (expires 2026-06-01)."
git push -u origin fix/audit-findings
gh pr create \
  --title "fix(deps): resolve high-severity audit findings in production dependencies" \
  --body-file docs/pr-body-audit-fixes.md \
  --label "security,dependencies"
```

---

## 3. Move Assets to S3

### PR Title
```
feat(cdn): migrate hero assets to S3 + CloudFront with local fallback
```

### PR Body
```markdown
## Problem

Hero carousel images are served from `/public/carousel/` via Next.js static serving.
This adds ~15 MB to the Vercel deployment bundle, increases cold start time,
and doesn't leverage edge caching or immutable cache headers.

## Solution

- `scripts/upload-asset-to-s3.sh` — manual upload with correct content-type + cache-control
- `HeroVideo.tsx` — reads `NEXT_PUBLIC_CDN_HERO_URL` env var, falls back to `/carousel/`
- `next.config.ts` — dynamic `remotePatterns` for CDN hostname
- `.github/workflows/ci-assets.yml` — auto-uploads changed `public/hero/*` to S3 on push to main
- `docs/cdn-hero-optimization.md` — ffmpeg commands for responsive variants (1080p/720p/480p WebM+MP4)

## Steps for QA

1. **Without CDN** (default): `unset NEXT_PUBLIC_CDN_HERO_URL && pnpm dev`
   → carousel loads from `/carousel/` as before
2. **With CDN**: set `NEXT_PUBLIC_CDN_HERO_URL=https://d1abc.cloudfront.net/hero/` in `.env.local`
   → carousel loads from CloudFront
3. Verify crossfade transition still works on both paths
4. Network tab: confirm `Cache-Control: public, max-age=31536000, immutable` on CDN responses
5. `pnpm verify` passes

## Risks

- **CDN unavailability**: If CloudFront goes down, images fail to load.
  Mitigation: local fallback is automatic when env var is unset. Quick rollback: delete env var in Vercel.
- **next/image remote patterns**: If CDN hostname changes, `next.config.ts` must be updated.
  Mitigation: hostname is parsed dynamically from env var at build time.
- **CORS**: S3 may block cross-origin requests.
  Mitigation: CloudFront OAI handles access; CORS not needed for `<img>` tags.

## Rollback plan

**Immediate (< 1 min):**
Delete `NEXT_PUBLIC_CDN_HERO_URL` in Vercel → redeploy → images revert to local.

**Full revert:**
`git revert <merge-sha> && git push origin main`

## Reviewers

- @Neiland85 (infra + frontend)
```

### Commands
```bash
git checkout -b feat/cdn-hero-assets
git add scripts/upload-asset-to-s3.sh \
  src/ui/components/HeroVideo.tsx \
  next.config.ts \
  .github/workflows/ci-assets.yml \
  docs/cdn-hero-optimization.md
git commit -m "feat(cdn): migrate hero assets to S3 + CloudFront with local fallback

Add CDN-aware image resolution in HeroVideo.tsx with NEXT_PUBLIC_CDN_HERO_URL.
Include upload script, CI workflow, and ffmpeg optimization guide.
Falls back to /carousel/ when env var is not set."
git push -u origin feat/cdn-hero-assets
gh pr create \
  --title "feat(cdn): migrate hero assets to S3 + CloudFront with local fallback" \
  --body-file .github/PULL_REQUEST_TEMPLATE/cdn-migration.md \
  --label "enhancement,infrastructure"
```

---

## 4. Enforce Branch Protection

### PR Title
```
chore(ci): enforce branch protection rules on main
```

### PR Body
```markdown
## Problem

During development, branch protection on `main` was bypassed multiple times
(PRs #28, #22 via `--admin` merge). Currently, direct pushes to main are possible
for admins, and required status checks can be skipped.

Before sale, the buyer expects production-grade governance:
- No direct pushes to main
- Required status checks enforced (lint, typecheck, test, build, E2E, audit)
- At least 1 approval required
- Conversation resolution required

## Solution

Apply branch protection via GitHub API:

```bash
gh api -X PUT repos/Neiland85/festival-platform-template/branches/main/protection \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "lint", "app_id": 15368},
      {"context": "typecheck", "app_id": 15368},
      {"context": "test", "app_id": 15368},
      {"context": "audit", "app_id": 15368},
      {"context": "build-and-e2e", "app_id": 15368}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "required_conversation_resolution": true,
  "restrictions": null
}
EOF
```

## Steps for QA

1. Try direct push to main → expect rejection
2. Open PR without checks passing → merge button disabled
3. Open PR, get approval, checks green → merge allowed
4. Verify `gh api repos/.../branches/main/protection` returns expected config

## Risks

- **Admin lockout**: With `enforce_admins: true`, even admins can't bypass.
  Mitigation: can temporarily disable via API if emergency hotfix needed.
- **CI flakiness**: If any required check is flaky, PRs get blocked.
  Mitigation: all 5 checks are deterministic and fast (<5 min total).

## Rollback plan

```bash
# Temporarily relax for emergency
gh api -X DELETE repos/Neiland85/festival-platform-template/branches/main/protection
```

## Reviewers

- @Neiland85 (repo owner)
```

### Commands
```bash
git checkout -b chore/enforce-branch-protection
# Add the protection script
git add scripts/enforce-branch-protection.sh
git commit -m "chore(ci): enforce branch protection rules on main

Enable required status checks, PR reviews, admin enforcement,
and conversation resolution. Prepares repo for buyer handoff."
git push -u origin chore/enforce-branch-protection
gh pr create \
  --title "chore(ci): enforce branch protection rules on main" \
  --body-file docs/pr-body-branch-protection.md \
  --label "governance,ci"
```

---

## 5. K6 Alerts

### PR Title
```
feat(sre): add k6 load test alerting with Prometheus thresholds
```

### PR Body
```markdown
## Problem

K6 load tests run in CI but failures are silent — no alerts, no Slack notifications,
no Prometheus integration. A regression in response times or error rates goes unnoticed
until a user reports it.

## Solution

- `k6/` profiles updated with `thresholds` (p95 < 500ms, error rate < 1%)
- `observability/alerts/k6-alerts.yml` — Prometheus alerting rules for k6 metrics
- `.github/workflows/k6.yml` — updated to output results as Prometheus remote-write
  (optional) and post summary to GitHub Step Summary
- Threshold failures cause CI to exit non-zero → PR blocked

## Steps for QA

1. Run `pnpm k6:smoke` locally → verify thresholds print in output
2. Intentionally degrade an endpoint (add `sleep(1000)`) → verify k6 fails with threshold breach
3. Check GitHub Actions summary for k6 results table
4. If Prometheus is configured: verify metrics appear in Grafana k6 dashboard

## Risks

- **Flaky thresholds in CI**: Network variance can cause p95 to spike.
  Mitigation: thresholds are generous (500ms p95 for smoke, 1000ms for load).
  CI uses `--vus 5` (low concurrency) for determinism.
- **Prometheus remote-write cost**: If enabled, k6 emits ~100 metrics/s.
  Mitigation: optional, disabled by default.

## Rollback plan

1. Revert k6 threshold changes: `git revert <sha>`
2. Alerting rules in `observability/` are declarative — delete file to remove alerts
3. CI workflow change is backward compatible (k6 still runs without thresholds)

## Reviewers

- @Neiland85 (SRE + performance)
```

### Commands
```bash
git checkout -b feat/k6-alerting
git add k6/ observability/alerts/k6-alerts.yml .github/workflows/k6.yml
git commit -m "feat(sre): add k6 load test alerting with Prometheus thresholds

Add p95 < 500ms and error_rate < 1% thresholds to k6 profiles.
Create Prometheus alerting rules for production k6 metrics.
CI now fails on threshold breach."
git push -u origin feat/k6-alerting
gh pr create \
  --title "feat(sre): add k6 load test alerting with Prometheus thresholds" \
  --body-file docs/pr-body-k6-alerts.md \
  --label "sre,monitoring"
```
