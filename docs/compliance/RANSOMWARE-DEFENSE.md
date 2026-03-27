# Ransomware Defense & Incident Response Plan

> Last updated: 2026-03-27 | Festival Platform Template v1.5+

## 1. Prevention Pillars

### 1.1 Software Updates (Patch Management)

| Component | Update Strategy | Automation |
|-----------|----------------|-----------|
| Node.js | Major version in CI (22.x) | `.github/workflows/ci.yml` |
| Dependencies | `pnpm audit` weekly + Dependabot | `.github/workflows/security-audit.yml` |
| CVE Overrides | 7 active overrides documented | `SECURITY/OVERRIDES.md` |
| OS/Runtime | Vercel manages runtime patches | Delegated |
| PostgreSQL | Neon manages database patches | Delegated |
| Docker images | `postgres:15` pinned | `docker-compose.yml` |

**Policy:** All HIGH/CRITICAL CVEs patched within 72 hours. MEDIUM within 2 weeks.

### 1.2 Data Backups (Recovery Capability)

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Neon auto-backup | Continuous (WAL) | 7 days (free), 30 days (pro) | Neon cloud (AWS) |
| Pre-migration dump | Before each migration | Indefinite | `backups/` directory |
| Database branch | Per PR (preview) | Until PR close | Neon branch |

**Backup Script:** `scripts/backup-before-migrate.sh`
- Format: `pg_dump --format=custom` (compressed, verified)
- Verification: `pg_restore --list` integrity check
- Safety: Refuses to backup localhost/test databases

**Recovery Procedure:**
```bash
# 1. Identify latest clean backup
ls -la backups/festival-*.dump

# 2. Restore to new database
pg_restore --clean --create -d $NEW_DATABASE_URL backups/festival-<name>-<timestamp>.dump

# 3. Verify data integrity
psql $NEW_DATABASE_URL -c "SELECT count(*) FROM leads; SELECT count(*) FROM orders;"

# 4. Update DATABASE_URL in Vercel
vercel env add DATABASE_URL production
```

### 1.3 Cautious Online Behavior (Supply Chain)

| Control | Implementation | File |
|---------|---------------|------|
| No lifecycle scripts | `.npmrc` `ignore-scripts=true` | `.npmrc` |
| Frozen lockfile | `pnpm install --frozen-lockfile` | CI + `.npmrc` |
| Exact versions | `save-exact=true` | `.npmrc` |
| Single registry | `registry=https://registry.npmjs.org/` | `.npmrc` |
| Dependabot alerts | Automatic PRs for vulnerable deps | GitHub Settings |
| Weekly audit | `pnpm audit` in CI | `security-audit.yml` |

## 2. Detection Systems

### 2.1 Runtime Integrity Monitoring

| Monitor | What It Detects | File |
|---------|----------------|------|
| Integrity Monitor | Missing secrets, weak configs, old Node.js | `integrity-monitor.ts` |
| DDoS Shield | Reconnaissance scanning (60 req/min) | `ddos-shield.ts` |
| Surge Predictor | Traffic anomalies (100+ leads/min) | `surgePredictor.ts` |
| Correlation Engine | Multi-signal attack patterns | `correlationEngine.ts` |
| Audit Log | Unauthorized access attempts | `auditLog.ts` |
| Circuit Breaker | Redis/DB service disruption | `circuit-breaker.ts` |

### 2.2 CI/CD Security Gates

| Gate | What It Catches | Workflow |
|------|----------------|----------|
| `pnpm audit` | Known CVEs in dependencies | `ci.yml` + `security-audit.yml` |
| `eslint-plugin-security` | Unsafe code patterns (eval, ReDoS) | `ci.yml` |
| Frozen lockfile | Unauthorized dependency changes | `ci.yml` |
| GitGuardian | Secrets in commits | GitHub integration |
| Codecov | Coverage regressions (80% threshold) | `ci.yml` |

## 3. Response Procedures

### 3.1 Ransomware Incident Detected

```
MINUTE 0-5:   CONTAIN
              - Revoke all admin sessions
              - Rotate DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD
              - Enable Vercel password protection

MINUTE 5-15:  ASSESS
              - Check audit logs: /api/admin/audit-log
              - Check surge predictor: /api/admin/surge
              - Identify compromised entry point
              - Determine if data was exfiltrated

MINUTE 15-30: RECOVER
              - Restore from latest clean Neon backup
              - Deploy from known-good git commit
              - Verify integrity with integrity-monitor.ts

HOUR 1:       NOTIFY
              - AEPD notification (if personal data affected, GDPR 72h rule)
              - Affected users notification
              - Internal incident report

HOUR 24-72:   REMEDIATE
              - Patch exploited vulnerability
              - Update SECURITY/OVERRIDES.md
              - Review and update defense matrix
              - Post-incident review
```

### 3.2 Supply Chain Attack Detected

```
1. FREEZE:    pnpm install --frozen-lockfile (verify current state)
2. IDENTIFY:  pnpm audit --json | jq '.advisories'
3. PATCH:     Add override to pnpm.overrides in package.json
4. DOCUMENT:  Update SECURITY/OVERRIDES.md with CVE details
5. DEPLOY:    Push fix through CI pipeline
6. VERIFY:    Run security-audit.yml workflow manually
```

### 3.3 Credential Compromise Detected

```
1. ROTATE:    All secrets via Vercel Environment Variables
              - SESSION_SECRET (invalidates all sessions)
              - ADMIN_PASSWORD (forces re-login)
              - CSRF_SECRET (new CSRF tokens)
              - STRIPE_SECRET_KEY (regenerate in Stripe dashboard)
              - DATABASE_URL (new Neon credentials)

2. AUDIT:     Review audit log for unauthorized actions
3. REVOKE:    Clear all sessions (restart Vercel deployment)
4. MONITOR:   Watch surge predictor for 48 hours
```

## 4. Current Attack Surface Assessment

### Entry Points (ranked by risk)

| Entry Point | Risk | Protection | Residual Risk |
|-------------|------|-----------|---------------|
| npm install | HIGH | frozen-lockfile + ignore-scripts + weekly audit | LOW |
| GitHub Actions | HIGH | minimal permissions + official actions only | LOW |
| Admin login | HIGH | bcrypt + 5/min rate limit + auto-ban | LOW |
| Stripe webhooks | MEDIUM | HMAC-SHA256 signature + idempotency | VERY LOW |
| Public API endpoints | MEDIUM | DDoS shield + rate limiting | LOW |
| Database connection | MEDIUM | TLS + configurable cert verification | LOW |
| Environment variables | MEDIUM | Zod validation + no defaults in prod | LOW |
| CMS (Sanity) | LOW | Webhook secret + revalidate rate limit | VERY LOW |

### 2026 Emerging Threats

| Threat | Description | Our Defense |
|--------|-------------|-------------|
| AI-generated phishing | LLM-crafted social engineering | Admin-only access, no user-facing auth |
| Supply chain via AI tools | Malicious packages recommended by AI | Frozen lockfile, ignore-scripts |
| Quantum computing prep | Future decryption of current data | HMAC-SHA256 (quantum-safe for signatures) |
| API abuse via botnets | Distributed credential stuffing | Redis-backed rate limiting + auto-ban |
| Zero-day in Node.js | Runtime vulnerability | Vercel patches runtime, we pin major version |

## 5. Review Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Dependency audit | Weekly (automated) | CI pipeline |
| Secret rotation | Quarterly | Security lead |
| Backup verification | Monthly | Engineering |
| Incident response drill | Semi-annually | Full team |
| Defense matrix review | Quarterly | Security lead |
| Penetration testing | Annually | External vendor |
