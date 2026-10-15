#!/usr/bin/env bash
# One-time move of the images from the server's disk to S3, for when CloudFront is ready.
# Run on the server: ./deploy/media-to-s3.sh
# Then in .env: STORAGE_DRIVER=s3, S3_PUBLIC_BUCKET=..., NEXT_PUBLIC_MEDIA_BASE_URL=https://img.shilpeemaitra.com
# and run ./deploy/deploy.sh (the image address is built into the pages). Keep /srv/shilpee-media until you have checked.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
: "${S3_PUBLIC_BUCKET:?Set S3_PUBLIC_BUCKET in .env first}"
: "${S3_PRIVATE_BUCKET:?Set S3_PRIVATE_BUCKET in .env first}"
region="${S3_REGION:-ap-south-1}"
src="${STORAGE_DIR:-/srv/shilpee-media}"
cache="public, max-age=31536000, immutable"

# One pass per file type, so each file gets the right Content-Type.
aws s3 sync "$src/public/img" "s3://$S3_PUBLIC_BUCKET/img" --region "$region" --only-show-errors \
  --exclude "*" --include "*.avif" --content-type image/avif --cache-control "$cache"
aws s3 sync "$src/public/img" "s3://$S3_PUBLIC_BUCKET/img" --region "$region" --only-show-errors \
  --exclude "*" --include "*.webp" --content-type image/webp --cache-control "$cache"
aws s3 sync "$src/public/img" "s3://$S3_PUBLIC_BUCKET/img" --region "$region" --only-show-errors \
  --exclude "*" --include "*.jpg" --content-type image/jpeg --cache-control "$cache"

# Full-size originals stay private.
aws s3 sync "$src/private/masters" "s3://$S3_PRIVATE_BUCKET/masters" --region "$region" --only-show-errors

echo "Copied. Public files: $(find "$src/public/img" -type f | wc -l). Now switch .env and run ./deploy/deploy.sh"
