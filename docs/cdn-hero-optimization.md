# CDN Hero Assets — Optimization Guide

## Architecture

```
public/carousel/          ← local fallback (committed to repo)
       ↓
  NEXT_PUBLIC_CDN_HERO_URL set?
       ↓ yes                      ↓ no
  S3 + CloudFront             /carousel/ (Next.js static)
  (immutable cache,
   global edge delivery)
```

## Image Optimization Recommendations

### Current format: WebP

The carousel currently uses WebP images. For maximum performance:

| Format | Use case | Savings vs JPEG |
|--------|----------|-----------------|
| WebP   | Default — broad browser support | ~30% smaller |
| AVIF   | Progressive enhancement (modern browsers) | ~50% smaller |
| JPEG   | Fallback for legacy | baseline |

### Responsive variants

Generate 3 breakpoints to avoid loading 4K images on mobile:

```bash
# ── Generate responsive WebP variants ─────────────────
# Input: hero-01.webp (original, assumed ≥1920px wide)

for img in public/carousel/hero-*.webp; do
  base=$(basename "$img" .webp)

  # 1920px — desktop (quality 82, good balance)
  ffmpeg -i "$img" -vf "scale=1920:-1" -quality 82 \
    "public/carousel/${base}-1920w.webp"

  # 1280px — tablet
  ffmpeg -i "$img" -vf "scale=1280:-1" -quality 80 \
    "public/carousel/${base}-1280w.webp"

  # 768px — mobile
  ffmpeg -i "$img" -vf "scale=768:-1" -quality 78 \
    "public/carousel/${base}-768w.webp"

  echo "✅ Generated variants for $base"
done
```

### AVIF generation (optional, highest compression)

```bash
for img in public/carousel/hero-*.webp; do
  base=$(basename "$img" .webp)

  # AVIF with crf 30 (good quality, ~50% smaller than JPEG)
  ffmpeg -i "$img" -c:v libaom-av1 -crf 30 -still-picture 1 \
    "public/carousel/${base}-1920w.avif"

  echo "✅ AVIF: $base"
done
```

## Video Asset Optimization (if re-adding video hero)

If you decide to add video back alongside the carousel:

### Multi-resolution encode (WebM VP9 + MP4 H.264)

```bash
INPUT="raw/hero-aftermovie.mp4"

# ── WebM VP9 (best compression, modern browsers) ─────
# 1080p — desktop
ffmpeg -i "$INPUT" \
  -c:v libvpx-vp9 -b:v 1800k -maxrate 2500k -bufsize 5000k \
  -vf "scale=1920:1080" \
  -c:a libopus -b:a 128k \
  -row-mt 1 -tile-columns 2 -threads 8 \
  -an \
  public/hero/aftermovie-1080p.webm

# 720p — tablet
ffmpeg -i "$INPUT" \
  -c:v libvpx-vp9 -b:v 1200k -maxrate 1800k -bufsize 3600k \
  -vf "scale=1280:720" \
  -c:a libopus -b:a 96k \
  -row-mt 1 -tile-columns 2 -threads 8 \
  -an \
  public/hero/aftermovie-720p.webm

# 480p — mobile / slow connections
ffmpeg -i "$INPUT" \
  -c:v libvpx-vp9 -b:v 600k -maxrate 900k -bufsize 1800k \
  -vf "scale=854:480" \
  -row-mt 1 -tile-columns 1 -threads 4 \
  -an \
  public/hero/aftermovie-480p.webm

# ── MP4 H.264 (fallback, universal compat) ───────────
# 1080p
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset slow -crf 23 \
  -vf "scale=1920:1080" \
  -movflags +faststart \
  -an \
  public/hero/aftermovie-1080p.mp4

# 720p
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset slow -crf 24 \
  -vf "scale=1280:720" \
  -movflags +faststart \
  -an \
  public/hero/aftermovie-720p.mp4

# 480p
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset slow -crf 26 \
  -vf "scale=854:480" \
  -movflags +faststart \
  -an \
  public/hero/aftermovie-480p.mp4
```

### Bitrate guidelines

| Resolution | WebM VP9 target | MP4 H.264 CRF | Expected size (30s) |
|------------|-----------------|----------------|---------------------|
| 1080p      | 1800 kbps       | CRF 23         | ~7 MB WebM, ~10 MB MP4 |
| 720p       | 1200 kbps       | CRF 24         | ~4.5 MB WebM, ~7 MB MP4 |
| 480p       | 600 kbps        | CRF 26         | ~2.3 MB WebM, ~4 MB MP4 |

### Key flags explained

- `-movflags +faststart` — moves MP4 metadata to front (enables streaming before full download)
- `-an` — strips audio (hero videos are typically muted)
- `-row-mt 1` — VP9 multi-threaded encoding (2-4x faster)
- `-crf` — constant quality (lower = better quality, bigger file)
- `-maxrate/-bufsize` — caps peak bitrate for smooth streaming

## S3 + CloudFront Setup

### 1. Create S3 bucket

```bash
aws s3 mb s3://festival-hero-assets --region eu-west-1
```

### 2. Bucket policy (CloudFront OAI)

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "CloudFrontOAI",
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity EXXXXX"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::festival-hero-assets/*"
  }]
}
```

### 3. IAM policy for CI uploads

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:PutObjectAcl"],
    "Resource": "arn:aws:s3:::festival-hero-assets/hero/*"
  }, {
    "Effect": "Allow",
    "Action": "cloudfront:CreateInvalidation",
    "Resource": "arn:aws:cloudfront::*:distribution/EXXXXX"
  }]
}
```

### 4. CloudFront configuration

- Origin: `festival-hero-assets.s3.eu-west-1.amazonaws.com`
- Origin Access: OAI (not public bucket)
- Cache policy: `CachingOptimized` (respects `Cache-Control` headers)
- Compress objects: Yes (gzip + brotli for text; images/videos already compressed)
- Price class: Use only edge locations in Europe and North America (cost optimization)

### 5. Upload initial assets

```bash
S3_BUCKET=festival-hero-assets \
AWS_REGION=eu-west-1 \
CDN_DOMAIN=d1abc.cloudfront.net \
  bash scripts/upload-asset-to-s3.sh public/carousel/
```

### 6. Set Vercel env var

```bash
NEXT_PUBLIC_CDN_HERO_URL=https://d1abc.cloudfront.net/hero/
```

## Cost estimate (free tier + low traffic)

| Service | Free tier | Estimated cost (10k visits/mo) |
|---------|-----------|-------------------------------|
| S3 storage | 5 GB | ~$0.02/mo (100 MB of images) |
| S3 GET requests | 20k | $0.00 |
| CloudFront transfer | 1 TB/mo | $0.00 (well under limit) |
| CloudFront requests | 10M/mo | $0.00 |
| **Total** | | **~$0.02/mo** |
