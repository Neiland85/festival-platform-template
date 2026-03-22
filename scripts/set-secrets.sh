#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# scripts/set-secrets.sh — Provision GitHub Actions secrets
#
# Creates or updates repository secrets required by the CI/CD
# pipeline. Uses `gh` (GitHub CLI) under the hood.
#
# USAGE:
#   ./scripts/set-secrets.sh                          # interactive / env vars
#   ./scripts/set-secrets.sh --repo owner/repo        # explicit repo
#   ./scripts/set-secrets.sh --admin-password "s3cr3t" # pass values inline
#
# All values can be supplied via:
#   1. CLI flags (--admin-password, --session-secret, etc.)
#   2. Environment variables (ADMIN_PASSWORD, SESSION_SECRET, etc.)
#   3. Prompted interactively (SESSION_SECRET auto-generated if empty)
#
# SESSION_SECRET is auto-generated with `openssl rand -base64 48`
# unless explicitly provided.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✔${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()  { echo -e "${RED}✖${NC}  $*" >&2; exit 1; }

# ── Defaults ──────────────────────────────────────────────────
REPO=""
VAL_ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
VAL_SESSION_SECRET="${SESSION_SECRET:-}"
VAL_SENTRY_DSN="${SENTRY_DSN:-}"
VAL_STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
VAL_REDIS_URL="${REDIS_URL:-}"

# ── Parse CLI flags ───────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)               REPO="$2";                shift 2 ;;
    --admin-password)     VAL_ADMIN_PASSWORD="$2";  shift 2 ;;
    --session-secret)     VAL_SESSION_SECRET="$2";  shift 2 ;;
    --sentry-dsn)         VAL_SENTRY_DSN="$2";      shift 2 ;;
    --stripe-secret-key)  VAL_STRIPE_SECRET_KEY="$2"; shift 2 ;;
    --redis-url)          VAL_REDIS_URL="$2";       shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--repo owner/repo] [--admin-password VAL] ..."
      echo ""
      echo "Flags:"
      echo "  --repo               GitHub repo (owner/repo). Auto-detected if omitted."
      echo "  --admin-password     Dashboard login password"
      echo "  --session-secret     HMAC signing key (auto-generated if empty)"
      echo "  --sentry-dsn         Sentry DSN URL (optional)"
      echo "  --stripe-secret-key  Stripe API secret key (optional)"
      echo "  --redis-url          Redis connection URL (optional)"
      exit 0
      ;;
    *) fail "Unknown flag: $1. Use --help for usage." ;;
  esac
done

# ══════════════════════════════════════════════════════════════
# PRECONDITION CHECKS
# ══════════════════════════════════════════════════════════════

info "Running precondition checks..."

# 1. gh installed
command -v gh >/dev/null 2>&1 || fail "gh (GitHub CLI) not found. Install: https://cli.github.com"
ok "gh CLI found: $(gh --version | head -1)"

# 2. gh authenticated
gh auth status >/dev/null 2>&1 || fail "gh not authenticated. Run: gh auth login"
ok "gh authenticated"

# 3. Detect repo if not provided
if [[ -z "$REPO" ]]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) \
    || fail "Could not detect repo. Pass --repo owner/repo or run from inside the git repo."
fi
ok "Target repo: ${REPO}"

# 4. Verify repo access
gh repo view "$REPO" --json name >/dev/null 2>&1 \
  || fail "Cannot access repo ${REPO}. Check permissions."
ok "Repo accessible"

echo ""

# ══════════════════════════════════════════════════════════════
# GENERATE / VALIDATE VALUES
# ══════════════════════════════════════════════════════════════

# Auto-generate SESSION_SECRET if not provided
if [[ -z "$VAL_SESSION_SECRET" ]]; then
  VAL_SESSION_SECRET=$(openssl rand -base64 48)
  info "SESSION_SECRET auto-generated (openssl rand -base64 48)"
fi

# Validate required: ADMIN_PASSWORD
if [[ -z "$VAL_ADMIN_PASSWORD" ]]; then
  fail "ADMIN_PASSWORD is required. Pass --admin-password or set env var."
fi

# Validate SESSION_SECRET length (min 32 chars, matches Zod schema)
if [[ ${#VAL_SESSION_SECRET} -lt 32 ]]; then
  fail "SESSION_SECRET must be at least 32 characters (got ${#VAL_SESSION_SECRET})."
fi

# ══════════════════════════════════════════════════════════════
# SET SECRETS
# ══════════════════════════════════════════════════════════════

SECRETS_SET=0
SECRETS_SKIPPED=0

set_secret() {
  local name="$1"
  local value="$2"
  local required="${3:-true}"

  if [[ -z "$value" ]]; then
    if [[ "$required" == "true" ]]; then
      fail "${name} is required but empty."
    else
      warn "${name} is empty — skipping (optional)"
      SECRETS_SKIPPED=$((SECRETS_SKIPPED + 1))
      return
    fi
  fi

  echo -n "$value" | gh secret set "$name" --repo "$REPO" --body -
  ok "${name} set"
  SECRETS_SET=$((SECRETS_SET + 1))
}

info "Setting secrets on ${REPO}..."
echo ""

set_secret "ADMIN_PASSWORD"     "$VAL_ADMIN_PASSWORD"     "true"
set_secret "SESSION_SECRET"     "$VAL_SESSION_SECRET"     "true"
set_secret "SENTRY_DSN"         "$VAL_SENTRY_DSN"         "false"
set_secret "STRIPE_SECRET_KEY"  "$VAL_STRIPE_SECRET_KEY"  "false"
set_secret "REDIS_URL"          "$VAL_REDIS_URL"          "false"

echo ""

# ══════════════════════════════════════════════════════════════
# VERIFICATION
# ══════════════════════════════════════════════════════════════

info "Verifying secrets on ${REPO}..."
echo ""
gh secret list --repo "$REPO"
echo ""

ok "Done — ${SECRETS_SET} secret(s) set, ${SECRETS_SKIPPED} skipped."

# ══════════════════════════════════════════════════════════════
# VAULT / AWS SECRETS MANAGER — REFERENCE
# ══════════════════════════════════════════════════════════════
#
# If you want to store these secrets in a centralized secret
# manager instead of (or in addition to) GitHub Actions secrets,
# use the examples below.
#
# ── HashiCorp Vault ──────────────────────────────────────────
#
#   # Store all secrets in a single KV path:
#   vault kv put secret/festival-platform/production \
#     ADMIN_PASSWORD="$(echo -n "$VAL_ADMIN_PASSWORD")" \
#     SESSION_SECRET="$(echo -n "$VAL_SESSION_SECRET")" \
#     SENTRY_DSN="$(echo -n "$VAL_SENTRY_DSN")" \
#     STRIPE_SECRET_KEY="$(echo -n "$VAL_STRIPE_SECRET_KEY")" \
#     REDIS_URL="$(echo -n "$VAL_REDIS_URL")"
#
#   # Read back:
#   vault kv get secret/festival-platform/production
#
#   # In CI, use hashicorp/vault-action@v2 to inject at runtime.
#
# ── AWS Secrets Manager ──────────────────────────────────────
#
#   # Create a JSON secret with all values:
#   aws secretsmanager create-secret \
#     --name "festival-platform/production" \
#     --description "Festival Engine production secrets" \
#     --secret-string "$(jq -n \
#       --arg ap "$VAL_ADMIN_PASSWORD" \
#       --arg ss "$VAL_SESSION_SECRET" \
#       --arg sd "$VAL_SENTRY_DSN" \
#       --arg sk "$VAL_STRIPE_SECRET_KEY" \
#       --arg ru "$VAL_REDIS_URL" \
#       '{ADMIN_PASSWORD:$ap, SESSION_SECRET:$ss, SENTRY_DSN:$sd, STRIPE_SECRET_KEY:$sk, REDIS_URL:$ru}')" \
#     --region eu-central-1
#
#   # Update existing:
#   aws secretsmanager update-secret \
#     --secret-id "festival-platform/production" \
#     --secret-string "$(jq -n ...)"
#
#   # In CI, use aws-actions/aws-secretsmanager-get-secrets@v1.
#
# ══════════════════════════════════════════════════════════════
