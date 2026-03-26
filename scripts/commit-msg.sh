#!/usr/bin/env bash
# Git commit-msg hook — validates conventional commits format.
#
# Install: cp scripts/commit-msg.sh .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg
# Or:      echo 'bash scripts/commit-msg.sh "$1"' > .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg

set -euo pipefail

MSG_FILE="${1:-.git/COMMIT_EDITMSG}"
MSG=$(head -1 "$MSG_FILE")

# Conventional commits pattern: type(scope): description
# Scope is optional. Co-Authored-By lines are allowed.
PATTERN="^(feat|fix|chore|refactor|test|docs|style|perf|ci|build|revert)(\([a-z0-9-]+\))?: .{1,100}$"

if ! echo "$MSG" | grep -qE "$PATTERN"; then
  echo ""
  echo "ERROR: Commit message does not follow Conventional Commits."
  echo ""
  echo "  Expected: <type>(<scope>): <description>"
  echo ""
  echo "  Types:    feat | fix | chore | refactor | test | docs | style | perf | ci | build | revert"
  echo "  Scope:    optional, lowercase kebab-case (e.g., i18n, email, auth, db)"
  echo "  Desc:     1-100 chars, lowercase start"
  echo ""
  echo "  Examples:"
  echo "    feat(email): add campaign CRUD endpoints"
  echo "    fix(i18n): await locale params for Next.js 15"
  echo "    chore: update dependencies"
  echo ""
  echo "  Got: \"$MSG\""
  echo ""
  exit 1
fi
