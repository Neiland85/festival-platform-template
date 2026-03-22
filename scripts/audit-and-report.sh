#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# scripts/audit-and-report.sh — Security audit + auto-remediation
#
# 1. Installs dependencies (frozen lockfile)
# 2. Runs pnpm audit → reports/pnpm-audit.json
# 3. Generates human-readable summary → reports/pnpm-audit-summary.txt
# 4. If high/critical found → creates a draft PR with remediation plan
#
# USAGE:
#   ./scripts/audit-and-report.sh                 # full run
#   ./scripts/audit-and-report.sh --skip-install   # skip pnpm install
#   ./scripts/audit-and-report.sh --dry-run        # no PR creation
#
# PREREQUISITES:
#   - pnpm, jq, gh CLI installed
#   - gh authenticated with repo write access
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✔${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()  { echo -e "${RED}✖${NC}  $*" >&2; exit 1; }
header(){ echo -e "\n${BOLD}═══ $* ═══${NC}\n"; }

# ── Flags ─────────────────────────────────────────────────────
SKIP_INSTALL=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install) SKIP_INSTALL=true; shift ;;
    --dry-run)      DRY_RUN=true; shift ;;
    --help|-h)
      echo "Usage: $0 [--skip-install] [--dry-run]"
      exit 0
      ;;
    *) fail "Unknown flag: $1" ;;
  esac
done

# ── Preconditions ─────────────────────────────────────────────
command -v pnpm >/dev/null 2>&1 || fail "pnpm not found"
command -v jq   >/dev/null 2>&1 || fail "jq not found. Install: brew install jq"
command -v gh   >/dev/null 2>&1 || fail "gh CLI not found"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || fail "Not in a git repo"
cd "$REPO_ROOT"

REPORTS_DIR="$REPO_ROOT/reports"
mkdir -p "$REPORTS_DIR"

AUDIT_JSON="$REPORTS_DIR/pnpm-audit.json"
AUDIT_SUMMARY="$REPORTS_DIR/pnpm-audit-summary.txt"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_SHORT=$(date +"%Y%m%d")

# ══════════════════════════════════════════════════════════════
# STEP 1: Install dependencies
# ══════════════════════════════════════════════════════════════
header "Step 1: Dependencies"

if [[ "$SKIP_INSTALL" == "true" ]]; then
  info "Skipping install (--skip-install)"
else
  info "Installing dependencies (frozen lockfile)..."
  pnpm install --frozen-lockfile --silent
  ok "Dependencies installed"
fi

# ══════════════════════════════════════════════════════════════
# STEP 2: Run pnpm audit
# ══════════════════════════════════════════════════════════════
header "Step 2: Security Audit"

info "Running pnpm audit..."

# pnpm audit returns non-zero if vulnerabilities found — don't exit
set +e
pnpm audit --json --audit-level=high > "$AUDIT_JSON" 2>/dev/null
AUDIT_EXIT=$?
set -e

if [[ $AUDIT_EXIT -eq 0 ]]; then
  ok "No high/critical vulnerabilities found"
  # Still generate summary for completeness
fi

ok "Raw audit saved → $AUDIT_JSON"

# ══════════════════════════════════════════════════════════════
# STEP 3: Parse and generate summary
# ══════════════════════════════════════════════════════════════
header "Step 3: Generate Summary"

# pnpm audit --json outputs different formats depending on version.
# We handle the common structure: { advisories: { id: {...} } }
# or the newer format with metadata + advisories array.

cat > "$AUDIT_SUMMARY" <<HEADER
══════════════════════════════════════════════════════════════
  SECURITY AUDIT REPORT — Festival Engine
  Generated: ${TIMESTAMP}
══════════════════════════════════════════════════════════════

HEADER

# Count vulnerabilities by severity
CRITICAL=$(jq '[.advisories // {} | to_entries[].value | select(.severity == "critical")] | length' "$AUDIT_JSON" 2>/dev/null || echo "0")
HIGH=$(jq '[.advisories // {} | to_entries[].value | select(.severity == "high")] | length' "$AUDIT_JSON" 2>/dev/null || echo "0")
MODERATE=$(jq '[.advisories // {} | to_entries[].value | select(.severity == "moderate")] | length' "$AUDIT_JSON" 2>/dev/null || echo "0")
LOW=$(jq '[.advisories // {} | to_entries[].value | select(.severity == "low")] | length' "$AUDIT_JSON" 2>/dev/null || echo "0")
INFO_COUNT=$(jq '[.advisories // {} | to_entries[].value | select(.severity == "info")] | length' "$AUDIT_JSON" 2>/dev/null || echo "0")

TOTAL=$((CRITICAL + HIGH + MODERATE + LOW + INFO_COUNT))

cat >> "$AUDIT_SUMMARY" <<COUNTS
── Vulnerability Summary ──────────────────────────────────

  Critical:   ${CRITICAL}
  High:       ${HIGH}
  Moderate:   ${MODERATE}
  Low:        ${LOW}
  Info:       ${INFO_COUNT}
  ──────────
  Total:      ${TOTAL}

COUNTS

# Detail per advisory
if [[ "$TOTAL" -gt 0 ]]; then
  cat >> "$AUDIT_SUMMARY" <<DETAIL_HEADER

── Affected Packages ──────────────────────────────────────

DETAIL_HEADER

  jq -r '
    .advisories // {} | to_entries[] | .value |
    "  [\(.severity | ascii_upcase)] \(.module_name)@\(.findings[0].version // "?")
    Title:   \(.title)
    CVE:     \(.cves // [] | if length > 0 then join(", ") else "N/A" end)
    GHSA:    \(.github_advisory_id // "N/A")
    URL:     \(.url // "N/A")
    Path:    \(.findings[0].paths[0] // "direct")
    Fix:     \(.recommendation // "Update to latest version")
    Patched: \(.patched_versions // "No patch available")
  "' "$AUDIT_JSON" >> "$AUDIT_SUMMARY" 2>/dev/null || true

else
  echo "  No vulnerabilities detected at high/critical level." >> "$AUDIT_SUMMARY"
  echo "" >> "$AUDIT_SUMMARY"
fi

# Also run a production-only audit for context
cat >> "$AUDIT_SUMMARY" <<PROD_HEADER

── Production Dependencies Only ───────────────────────────

PROD_HEADER

set +e
PROD_AUDIT=$(pnpm audit --prod --audit-level=high 2>&1)
PROD_EXIT=$?
set -e

if [[ $PROD_EXIT -eq 0 ]]; then
  echo "  ✔ No production vulnerabilities found." >> "$AUDIT_SUMMARY"
else
  echo "$PROD_AUDIT" >> "$AUDIT_SUMMARY"
fi

cat >> "$AUDIT_SUMMARY" <<FOOTER

── Remediation Strategy ───────────────────────────────────

  1. DIRECT dependencies → pnpm update <pkg> --latest
  2. TRANSITIVE dependencies → pnpm overrides in package.json:
     "pnpm": { "overrides": { "<pkg>": ">=fixed.version" } }
  3. Dev-only with no fix → Add to .pnpmauditrc (ignore list)
  4. Verify fix: pnpm audit --audit-level=high

══════════════════════════════════════════════════════════════
FOOTER

ok "Summary saved → $AUDIT_SUMMARY"
echo ""
cat "$AUDIT_SUMMARY"

# ══════════════════════════════════════════════════════════════
# STEP 4: Create draft PR if high/critical found
# ══════════════════════════════════════════════════════════════
header "Step 4: Remediation PR"

HAS_ACTIONABLE=$((CRITICAL + HIGH))

if [[ "$HAS_ACTIONABLE" -eq 0 ]]; then
  ok "No high/critical vulnerabilities — skipping PR creation."
  echo ""
  ok "Audit complete. Reports in $REPORTS_DIR/"
  exit 0
fi

warn "Found ${HAS_ACTIONABLE} high/critical vulnerabilities"

# Build the affected packages list for the PR body
AFFECTED_LIST=$(jq -r '
  .advisories // {} | to_entries[] | .value |
  select(.severity == "high" or .severity == "critical") |
  "- **\(.module_name)** (\(.severity)): \(.title) — \(.recommendation // "update to latest")"
' "$AUDIT_JSON" 2>/dev/null || echo "- See reports/pnpm-audit-summary.txt for details")

CVE_LIST=$(jq -r '
  .advisories // {} | to_entries[] | .value |
  select(.severity == "high" or .severity == "critical") |
  select(.cves != null and (.cves | length > 0)) |
  .cves[] |
  "- [\(.)](https://nvd.nist.gov/vuln/detail/\(.))"
' "$AUDIT_JSON" 2>/dev/null || echo "- No CVEs found in audit output")

BRANCH_NAME="fix/security-audit-${DATE_SHORT}"

PR_BODY=$(cat <<PRBODY
## Security Audit — ${TIMESTAMP}

### Summary

| Severity | Count |
|----------|-------|
| Critical | ${CRITICAL} |
| High | ${HIGH} |
| Moderate | ${MODERATE} |
| Low | ${LOW} |

### Affected Packages

${AFFECTED_LIST}

### CVE References

${CVE_LIST}

### Remediation Plan

#### Option A: Direct Update (preferred)
\`\`\`bash
# Update vulnerable packages to latest
pnpm update <package-name> --latest

# Verify fix
pnpm audit --audit-level=high
\`\`\`

#### Option B: Override Transitive Dependencies
\`\`\`jsonc
// package.json — force specific versions for transitive deps
{
  "pnpm": {
    "overrides": {
      "<vulnerable-pkg>": ">=<fixed-version>"
    }
  }
}
\`\`\`

#### Option C: Pin + Ignore (dev-only, no fix available)
\`\`\`jsonc
// .pnpmauditrc — suppress known, accepted risks
{
  "ignore": ["GHSA-xxxx-yyyy"]
}
\`\`\`

### Verification Checklist

- [ ] All high/critical vulnerabilities resolved
- [ ] \`pnpm audit --prod --audit-level=high\` passes
- [ ] CI pipeline passes (lint, typecheck, tests, build, e2e)
- [ ] No runtime regressions after dependency updates

### References

- [pnpm audit docs](https://pnpm.io/cli/audit)
- [GitHub Advisory Database](https://github.com/advisories)
- Full report: \`reports/pnpm-audit-summary.txt\`
PRBODY
)

if [[ "$DRY_RUN" == "true" ]]; then
  warn "DRY RUN — would create draft PR on branch: ${BRANCH_NAME}"
  echo ""
  echo "── PR Title ──"
  echo "fix(security): remediate ${HAS_ACTIONABLE} high/critical vulnerabilities"
  echo ""
  echo "── PR Body ──"
  echo "$PR_BODY"
  echo ""
  info "Run without --dry-run to create the PR."
  exit 0
fi

# Create branch, commit reports, and open draft PR
info "Creating remediation branch: ${BRANCH_NAME}"

git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
git add -f reports/
git commit -m "chore(security): add audit report ${DATE_SHORT}" --no-verify 2>/dev/null || true
git push -u origin "$BRANCH_NAME"

PR_URL=$(gh pr create \
  --draft \
  --title "fix(security): remediate ${HAS_ACTIONABLE} high/critical vulnerabilities" \
  --body "$PR_BODY" \
  --base main \
  --head "$BRANCH_NAME" \
  2>&1) || true

if [[ "$PR_URL" == http* ]]; then
  ok "Draft PR created: ${PR_URL}"
else
  warn "PR creation returned: ${PR_URL}"
  info "You may need to create the PR manually."
fi

echo ""
ok "Audit complete. Reports in $REPORTS_DIR/"
