#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# scripts/protect-main.sh — Branch protection for main
#
# Sets up required status checks, admin enforcement, and PR
# review requirements on the `main` branch via GitHub REST API.
#
# USAGE:
#   ./scripts/protect-main.sh                     # auto-detect repo
#   ./scripts/protect-main.sh --repo owner/repo   # explicit repo
#   ./scripts/protect-main.sh --dry-run            # show payload, don't apply
#
# PREREQUISITES:
#   - gh CLI installed and authenticated
#   - Repo admin permissions (branch protection requires admin)
#   - CI workflow must have run at least once for GitHub to know
#     the check names (otherwise required_status_checks may not
#     match anything until the first CI run completes)
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✔${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()  { echo -e "${RED}✖${NC}  $*" >&2; exit 1; }

# ── Parse flags ───────────────────────────────────────────────
REPO=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)    REPO="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h)
      echo "Usage: $0 [--repo owner/repo] [--dry-run]"
      exit 0
      ;;
    *) fail "Unknown flag: $1" ;;
  esac
done

# ── Preconditions ─────────────────────────────────────────────
command -v gh >/dev/null 2>&1 || fail "gh CLI not found."
gh auth status >/dev/null 2>&1 || fail "gh not authenticated."

if [[ -z "$REPO" ]]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) \
    || fail "Could not detect repo. Pass --repo owner/repo."
fi

OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"

ok "Target: ${OWNER}/${REPO_NAME} (branch: main)"

# ══════════════════════════════════════════════════════════════
# STATUS CHECK NAME MAPPING
# ══════════════════════════════════════════════════════════════
#
# GitHub exposes status check names as:
#
#   "<workflow_name> / <job_name>"
#
# where <job_name> is the `name:` field of the job in ci.yml.
# Our workflow is named "CI", so the checks appear as:
#
#   ci.yml job key  │  job `name:`       │  GitHub check name
#   ────────────────┼────────────────────┼──────────────────────
#   lint            │  "🔍 Lint"         │  "🔍 Lint"
#   typecheck       │  "🔠 Typecheck"    │  "🔠 Typecheck"
#   test            │  "🧪 Tests"        │  "🧪 Tests"
#   audit           │  "🛡️ Audit"       │  "🛡️ Audit"
#   build           │  "🏗️ Build"       │  "🏗️ Build"
#   e2e             │  "🎭 E2E"          │  "🎭 E2E"
#
# IMPORTANT: GitHub uses the `name:` value, NOT the job key.
# If the workflow file has `name: CI` at the top level, the
# check names shown in the PR "Checks" tab are just the job
# names — no "CI / " prefix — for single-workflow repos.
#
# However, if you have multiple workflows, GitHub prefixes them:
#   "CI / 🔍 Lint"
#
# To find the exact names GitHub sees, run:
#   gh api "/repos/${OWNER}/${REPO_NAME}/commits/main/check-runs" \
#     --jq '.check_runs[].name'
#
# If the names don't match, the branch protection rule will
# silently accept PRs without running those checks.
# ══════════════════════════════════════════════════════════════

# ── Discover actual check names ───────────────────────────────
info "Discovering check names from latest commit on main..."
echo ""

KNOWN_CHECKS=$(gh api "/repos/${OWNER}/${REPO_NAME}/commits/main/check-runs" \
  --jq '.check_runs[].name' 2>/dev/null | sort -u) || true

if [[ -n "$KNOWN_CHECKS" ]]; then
  info "GitHub knows these checks:"
  echo "$KNOWN_CHECKS" | while read -r name; do
    echo "    • ${name}"
  done
  echo ""
else
  warn "No check runs found on main. Names will be set but may not match until CI runs once."
  echo ""
fi

# ── Build the JSON payload ────────────────────────────────────
#
# We use the job `name:` values directly. If your repo has
# multiple workflows and GitHub prefixes them, update these
# strings to include the prefix (e.g., "CI / 🔍 Lint").

PAYLOAD=$(cat <<'ENDJSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "🔍 Lint",
      "🔠 Typecheck",
      "🧪 Tests",
      "🛡️ Audit",
      "🏗️ Build"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
ENDJSON
)

# ── Apply or dry-run ──────────────────────────────────────────
if [[ "$DRY_RUN" == "true" ]]; then
  warn "DRY RUN — would send this payload to:"
  echo "    PATCH /repos/${OWNER}/${REPO_NAME}/branches/main/protection"
  echo ""
  echo "$PAYLOAD" | python3 -m json.tool 2>/dev/null || echo "$PAYLOAD"
  echo ""
  info "Run without --dry-run to apply."
  exit 0
fi

info "Applying branch protection to main..."

gh api \
  --method PUT \
  "/repos/${OWNER}/${REPO_NAME}/branches/main/protection" \
  --input - <<< "$PAYLOAD" > /dev/null

ok "Branch protection applied"

# ══════════════════════════════════════════════════════════════
# VERIFICATION
# ══════════════════════════════════════════════════════════════

echo ""
info "Verifying branch protection on main..."
echo ""

# Required status checks
info "Required status checks:"
gh api "/repos/${OWNER}/${REPO_NAME}/branches/main/protection/required_status_checks" \
  --jq '
    "    strict (up-to-date): \(.strict)",
    "    contexts:",
    (.contexts[] | "      • \(.)")
  ' 2>/dev/null || warn "Could not read status checks"

echo ""

# Enforce admins
info "Enforce admins:"
gh api "/repos/${OWNER}/${REPO_NAME}/branches/main/protection/enforce_admins" \
  --jq '"    enabled: \(.enabled)"' 2>/dev/null || warn "Could not read admin enforcement"

echo ""

# PR reviews
info "Required PR reviews:"
gh api "/repos/${OWNER}/${REPO_NAME}/branches/main/protection/required_pull_request_reviews" \
  --jq '
    "    approvals required: \(.required_approving_review_count)",
    "    dismiss stale: \(.dismiss_stale_reviews)",
    "    code owners: \(.require_code_owner_reviews)"
  ' 2>/dev/null || warn "Could not read PR review settings"

echo ""

# Summary
info "Full protection rule (raw):"
gh api "/repos/${OWNER}/${REPO_NAME}/branches/main/protection" \
  --jq '{
    required_status_checks: .required_status_checks.contexts,
    strict: .required_status_checks.strict,
    enforce_admins: .enforce_admins.enabled,
    required_reviews: .required_pull_request_reviews.required_approving_review_count,
    linear_history: .required_linear_history.enabled,
    force_pushes: .allow_force_pushes.enabled,
    deletions: .allow_deletions.enabled,
    conversation_resolution: .required_conversation_resolution.enabled
  }' 2>/dev/null || warn "Could not read full protection"

echo ""
ok "Done. Branch 'main' is now protected."
echo ""
info "To disable temporarily (emergencies only):"
echo "    gh api --method DELETE /repos/${OWNER}/${REPO_NAME}/branches/main/protection"
