#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:3000}"

echo "== / =="
curl -sI "$BASE/" | grep -i cache-control || true
echo

echo "== /eventos =="
curl -sI "$BASE/eventos" | grep -i cache-control || true
echo

echo "== /api/healthz =="
curl -sI "$BASE/api/healthz" | grep -i cache-control || true
echo "Checking cache headers for: $BASE"
echo

echo "== / (home) =="
curl -sI "$BASE/" | grep -iE "HTTP/|cache-control" || true
echo

echo "== /eventos (listing) =="
curl -sI "$BASE/eventos" | grep -iE "HTTP/|cache-control" || true
echo

echo "== /api/healthz =="
curl -sI "$BASE/api/healthz" | grep -iE "HTTP/|cache-control" || true
echo

echo "== /api/v1/leads (should be no-store) =="
curl -s -X POST -H "Content-Type: application/json" -d '{}' -D - -o /dev/null "$BASE/api/v1/leads" | grep -iE "HTTP/|cache-control" || true
echo
