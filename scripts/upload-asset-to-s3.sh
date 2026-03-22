#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# upload-asset-to-s3.sh — Upload hero assets to S3 / CloudFront
#
# Usage:
#   bash scripts/upload-asset-to-s3.sh <local_path> [s3_prefix]
#
# Examples:
#   bash scripts/upload-asset-to-s3.sh public/hero/aftermovie-1080p.mp4
#   bash scripts/upload-asset-to-s3.sh public/hero/ hero/   # entire folder
#
# Env vars (required):
#   S3_BUCKET          — target bucket name (e.g., festival-platform-assets)
#   AWS_REGION         — region (e.g., eu-west-1)
#   CDN_DOMAIN         — optional, CloudFront distribution domain
#
# Auth: uses default AWS CLI credentials chain
#   (env vars, ~/.aws/credentials, IAM role, etc.)
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ── Args ────────────────────────────────────────────
LOCAL_PATH="${1:?Usage: upload-asset-to-s3.sh <local_path> [s3_prefix]}"
S3_PREFIX="${2:-hero/}"

# ── Env ─────────────────────────────────────────────
: "${S3_BUCKET:?Set S3_BUCKET env var (e.g., festival-platform-assets)}"
: "${AWS_REGION:?Set AWS_REGION env var (e.g., eu-west-1)}"
CDN_DOMAIN="${CDN_DOMAIN:-}"

# ── Preconditions ───────────────────────────────────
command -v aws >/dev/null 2>&1 || { echo "❌ aws CLI not found. Install: https://aws.amazon.com/cli/"; exit 1; }

if [[ ! -e "$LOCAL_PATH" ]]; then
  echo "❌ Path not found: $LOCAL_PATH"
  exit 1
fi

# ── Content-Type mapping ────────────────────────────
content_type_for() {
  local ext="${1##*.}"
  case "$ext" in
    mp4)  echo "video/mp4" ;;
    webm) echo "video/webm" ;;
    mov)  echo "video/quicktime" ;;
    jpg|jpeg) echo "image/jpeg" ;;
    png)  echo "image/png" ;;
    webp) echo "image/webp" ;;
    avif) echo "image/avif" ;;
    svg)  echo "image/svg+xml" ;;
    *)    echo "application/octet-stream" ;;
  esac
}

# ── Upload single file ──────────────────────────────
upload_file() {
  local file="$1"
  local filename
  filename=$(basename "$file")
  local s3_key="${S3_PREFIX}${filename}"
  local ct
  ct=$(content_type_for "$filename")

  echo "⬆️  Uploading: $file → s3://${S3_BUCKET}/${s3_key}"

  aws s3 cp "$file" "s3://${S3_BUCKET}/${s3_key}" \
    --region "$AWS_REGION" \
    --content-type "$ct" \
    --cache-control "public, max-age=31536000, immutable" \
    --metadata-directive REPLACE

  # ── Output public URL ──
  if [[ -n "$CDN_DOMAIN" ]]; then
    local public_url="https://${CDN_DOMAIN}/${s3_key}"
  else
    local public_url="https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3_key}"
  fi

  echo "✅ Uploaded: $public_url"
  echo "$public_url"
}

# ── Main ────────────────────────────────────────────
UPLOADED_URLS=()

if [[ -d "$LOCAL_PATH" ]]; then
  echo "📁 Uploading directory: $LOCAL_PATH → s3://${S3_BUCKET}/${S3_PREFIX}"
  for file in "$LOCAL_PATH"/*; do
    [[ -f "$file" ]] || continue
    url=$(upload_file "$file")
    UPLOADED_URLS+=("$url")
  done
else
  url=$(upload_file "$LOCAL_PATH")
  UPLOADED_URLS+=("$url")
fi

echo ""
echo "──────────────────────────────────────────"
echo "📋 Uploaded ${#UPLOADED_URLS[@]} file(s):"
printf '   %s\n' "${UPLOADED_URLS[@]}"
echo ""
echo "Set in Vercel / .env.local:"
echo "  NEXT_PUBLIC_CDN_HERO_URL=https://${CDN_DOMAIN:-${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com}/${S3_PREFIX}"
echo "──────────────────────────────────────────"
