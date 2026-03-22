#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# optimize-hero-videos.sh — Generate optimized WebM + MP4 variants
#
# Requires: ffmpeg ≥ 5.0 with libvpx-vp9 and libx264 codecs.
#
# Usage:
#   bash scripts/optimize-hero-videos.sh <input_video> [output_dir]
#
# Example:
#   bash scripts/optimize-hero-videos.sh public/hero/aftermovie-raw.mov public/hero/
#
# Generates per input:
#   - {name}-1080p.webm  (VP9, CRF 30, ~2-4 MB/min)
#   - {name}-720p.webm   (VP9, CRF 32, ~1-2 MB/min)
#   - {name}-480p.webm   (VP9, CRF 34, ~0.5-1 MB/min)
#   - {name}-1080p.mp4   (H.264 High, CRF 23, ~3-5 MB/min)
#   - {name}-720p.mp4    (H.264 Main, CRF 24, ~1.5-3 MB/min)
#   - {name}-480p.mp4    (H.264 Main, CRF 26, ~0.8-1.5 MB/min)
#
# Design decisions:
#   - VP9 over AV1: better encode speed for this use case (hero clips <60s).
#     AV1 is ~20% smaller but 10x slower to encode.
#   - CRF-based (constant quality) over target bitrate: consistent quality
#     across scenes with different complexity.
#   - Two-pass VP9 for better quality distribution across the clip.
#   - Audio stripped: hero videos are muted (autoplay policy requires muted).
#   - faststart (MP4): moves moov atom to start for progressive playback.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

INPUT="${1:?Usage: optimize-hero-videos.sh <input_video> [output_dir]}"
OUTPUT_DIR="${2:-.}"
BASENAME=$(basename "${INPUT%.*}")

command -v ffmpeg >/dev/null 2>&1 || { echo "❌ ffmpeg not found"; exit 1; }

mkdir -p "$OUTPUT_DIR"

# ── Resolution / quality matrix ──────────────────────────────

declare -A RESOLUTIONS=(
  ["1080p"]="1920:-2"
  ["720p"]="1280:-2"
  ["480p"]="854:-2"
)

declare -A WEBM_CRF=(
  ["1080p"]="30"
  ["720p"]="32"
  ["480p"]="34"
)

declare -A MP4_CRF=(
  ["1080p"]="23"
  ["720p"]="24"
  ["480p"]="26"
)

declare -A MP4_PROFILE=(
  ["1080p"]="high"
  ["720p"]="main"
  ["480p"]="main"
)

echo "🎬 Input: $INPUT"
echo "📁 Output: $OUTPUT_DIR"
echo ""

for res in 1080p 720p 480p; do
  scale="${RESOLUTIONS[$res]}"

  # ── WebM (VP9, two-pass) ──────────────────────────────────
  WEBM_OUT="${OUTPUT_DIR}/${BASENAME}-${res}.webm"
  echo "🔵 Encoding WebM ${res} (VP9, CRF ${WEBM_CRF[$res]})..."

  # Pass 1
  ffmpeg -y -i "$INPUT" \
    -vf "scale=${scale}" \
    -c:v libvpx-vp9 \
    -crf "${WEBM_CRF[$res]}" \
    -b:v 0 \
    -an \
    -pass 1 \
    -passlogfile "/tmp/ffmpeg2pass-${BASENAME}-${res}" \
    -f null /dev/null 2>/dev/null

  # Pass 2
  ffmpeg -y -i "$INPUT" \
    -vf "scale=${scale}" \
    -c:v libvpx-vp9 \
    -crf "${WEBM_CRF[$res]}" \
    -b:v 0 \
    -an \
    -pass 2 \
    -passlogfile "/tmp/ffmpeg2pass-${BASENAME}-${res}" \
    -auto-alt-ref 1 \
    -lag-in-frames 25 \
    -tile-columns 2 \
    -threads 4 \
    "$WEBM_OUT" 2>/dev/null

  SIZE_WEBM=$(du -h "$WEBM_OUT" | cut -f1)
  echo "  ✅ ${WEBM_OUT} (${SIZE_WEBM})"

  # ── MP4 (H.264, single pass) ─────────────────────────────
  MP4_OUT="${OUTPUT_DIR}/${BASENAME}-${res}.mp4"
  echo "🟢 Encoding MP4 ${res} (H.264 ${MP4_PROFILE[$res]}, CRF ${MP4_CRF[$res]})..."

  ffmpeg -y -i "$INPUT" \
    -vf "scale=${scale}" \
    -c:v libx264 \
    -profile:v "${MP4_PROFILE[$res]}" \
    -crf "${MP4_CRF[$res]}" \
    -preset slow \
    -an \
    -movflags +faststart \
    -pix_fmt yuv420p \
    "$MP4_OUT" 2>/dev/null

  SIZE_MP4=$(du -h "$MP4_OUT" | cut -f1)
  echo "  ✅ ${MP4_OUT} (${SIZE_MP4})"
  echo ""
done

# ── Cleanup two-pass logs ───────────────────────────────────
rm -f /tmp/ffmpeg2pass-${BASENAME}-*.log

echo "──────────────────────────────────────────"
echo "📊 Results:"
echo ""
ls -lh "${OUTPUT_DIR}/${BASENAME}"-*.{webm,mp4} 2>/dev/null | awk '{print "  "$5"  "$NF}'
echo ""
echo "📌 Recommended VIDEO_MANIFEST update for HeroVideo.tsx:"
echo ""
echo "  {"
echo "    webm: heroSrc(\"${BASENAME}-1080p.webm\"),"
echo "    mp4:  heroSrc(\"${BASENAME}-1080p.mp4\"),"
echo "  }"
echo ""
echo "📌 Upload to S3:"
echo "  bash scripts/upload-asset-to-s3.sh ${OUTPUT_DIR}/${BASENAME}-1080p.webm"
echo "  bash scripts/upload-asset-to-s3.sh ${OUTPUT_DIR}/${BASENAME}-1080p.mp4"
echo "──────────────────────────────────────────"
