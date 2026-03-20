#!/usr/bin/env bash
# setup.sh — One-command local environment bootstrap.
# Usage:  pnpm setup   (or bash scripts/setup.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# ── 0. Validate prerequisites ───────────────────────────────────
command -v docker >/dev/null 2>&1 || {
  echo "❌  Docker not found. Install: https://docs.docker.com/get-docker/"
  exit 1
}
docker compose version >/dev/null 2>&1 || {
  echo "❌  Docker Compose V2 not found. Update Docker Desktop or install the compose plugin."
  exit 1
}
command -v pnpm >/dev/null 2>&1 || {
  echo "❌  pnpm not found. Install: npm i -g pnpm"
  exit 1
}
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌  Node 20+ required (found: $(node -v 2>/dev/null || echo 'none')). Use: nvm install 20"
  exit 1
fi

# ── 1. Copy .env.example → .env.local (skip if exists) ──────────
if [ -f .env.local ]; then
  echo "⏭️   .env.local already exists — skipping copy"
else
  cp .env.example .env.local
  echo "✅  Created .env.local from .env.example"
fi

# ── 2. Export env vars for tools that don't read .env.local ──────
#    (drizzle-kit uses dotenv which only reads .env, not .env.local)
set -a
# shellcheck source=/dev/null
source .env.local
set +a

# ── 3. Start Docker services and wait for healthy state ──────────
echo "🐳  Starting Docker services..."
docker compose up -d --wait --wait-timeout 60
echo "✅  PostgreSQL is ready"

# ── 4. Push Drizzle schema to DB ─────────────────────────────────
echo "📦  Pushing schema to database..."
pnpm db:push
echo "✅  Schema pushed"

# ── 5. Seed sample data ─────────────────────────────────────────
echo "🌱  Seeding database..."
pnpm db:seed
echo ""
echo "══════════════════════════════════════════════"
echo "  🎉  Setup complete!"
echo "  Run:  pnpm dev"
echo "  Open: http://localhost:3000"
echo "  Admin: http://localhost:3000/dashboard"
echo "  Password: see ADMIN_PASSWORD in .env.local"
echo "══════════════════════════════════════════════"
