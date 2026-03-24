#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# create-security-pr.sh
#
# Creates a security-focused PR with a structured checklist.
# Use when rotating secrets, fixing audit findings, or applying
# security patches.
#
# Usage:
#   ./scripts/create-security-pr.sh                     # interactive
#   ./scripts/create-security-pr.sh "rotate CSRF secret" # with description
#
# Prerequisites:
#   - gh CLI authenticated
#   - On a feature branch (not main)
#   - Changes staged or committed
# ──────────────────────────────────────────────────────────────

DESCRIPTION="${1:-}"
BRANCH=$(git branch --show-current)
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
TIMESTAMP=$(date +%Y-%m-%d)

# ── Validation ────────────────────────────────────────────────

if [[ "$BRANCH" == "main" ]]; then
  echo "❌ Cannot create security PR from main. Create a branch first:"
  echo "   git checkout -b security/rotate-secrets"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "❌ gh CLI not authenticated. Run: gh auth login"
  exit 1
fi

# Check for uncommitted changes
if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  You have uncommitted changes. Commit them first?"
  read -r -p "   Stage all and commit? [y/N] " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    git add -A
    git commit -m "security: ${DESCRIPTION:-audit fixes and secret rotation}"
  else
    echo "Aborting. Commit your changes and re-run."
    exit 1
  fi
fi

# Push branch
echo "📤 Pushing $BRANCH to origin..."
git push -u origin "$BRANCH"

# ── Prompt for description if not provided ────────────────────

if [[ -z "$DESCRIPTION" ]]; then
  read -r -p "🔒 Brief description of security changes: " DESCRIPTION
fi

# ── Create PR ─────────────────────────────────────────────────

PR_TITLE="security: ${DESCRIPTION}"

PR_BODY=$(cat <<EOF
## 🔒 Security PR — ${DESCRIPTION}

**Date:** ${TIMESTAMP}
**Branch:** \`${BRANCH}\`
**Author:** $(git config user.name)

---

## Changes

<!-- Describe what was changed and why -->

-

## Security checklist

### Secrets & credentials
- [ ] Secrets rotated in Vercel (production + preview)
- [ ] Secrets rotated in GitHub Actions secrets
- [ ] Old secrets invalidated / revoked
- [ ] No secrets in code, logs, or commit history
- [ ] \`.env.example\` updated if new vars added

### Audit & dependencies
- [ ] \`pnpm audit --prod --audit-level=high\` passes
- [ ] Vulnerable dependencies updated or patched
- [ ] No new \`overrides\` without justification and expiry date
- [ ] Dependabot alerts reviewed and addressed

### Code security
- [ ] Input validation with Zod on all new endpoints
- [ ] SQL queries use Drizzle ORM (parameterized)
- [ ] CSRF protection on mutation endpoints
- [ ] Rate limiting on public endpoints
- [ ] No \`eval()\`, \`innerHTML\`, or dynamic SQL
- [ ] IPs hashed before storage (\`hashIp()\`)
- [ ] GDPR compliance maintained

### Infrastructure
- [ ] CI secrets masked with \`::add-mask::\`
- [ ] DATABASE_URL guard in CI prevents production access
- [ ] Branch protection rules intact after merge
- [ ] Sentry DSN and error monitoring active

### Verification
- [ ] \`pnpm verify\` passes (lint + typecheck + test + build)
- [ ] E2E tests pass
- [ ] Production deployment tested after merge
- [ ] No regressions in existing functionality

---

## Rollback plan

<!-- How to undo these changes if something breaks -->

1. Revert this PR: \`git revert <merge-sha>\`
2. Restore previous secrets from backup
3. Redeploy via Vercel

## Post-merge actions

- [ ] Verify production deployment
- [ ] Confirm rotated secrets work in production
- [ ] Update team on completed security changes
- [ ] Close related security advisories / issues

---

> ⚠️ **This PR should be reviewed promptly and merged within 24 hours.**
> Security PRs should not sit open — they may contain information about vulnerabilities.
EOF
)

echo "🔒 Creating security PR..."
PR_URL=$(gh pr create \
  --title "$PR_TITLE" \
  --body "$PR_BODY" \
  --label "security" \
  2>&1) || {
    # Label might not exist — try without it
    PR_URL=$(gh pr create \
      --title "$PR_TITLE" \
      --body "$PR_BODY" \
      2>&1)
  }

echo ""
echo "✅ Security PR created:"
echo "   $PR_URL"
echo ""
echo "📋 Next steps:"
echo "   1. Fill in the Changes section"
echo "   2. Complete the security checklist"
echo "   3. Request review from security-aware team member"
echo "   4. Merge within 24h"
