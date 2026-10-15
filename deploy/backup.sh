#!/usr/bin/env bash
# Nightly backup to the private S3 bucket. Run from cron (see crontab.txt).
#   1. MongoDB dump      -> s3://$S3_PRIVATE_BUCKET/backups/mongo/<time>.archive.gz  (kept 30 days by a lifecycle rule)
#   2. Image folder copy -> s3://$S3_PRIVATE_BUCKET/media/  (only with STORAGE_DRIVER=local; a mirror, files are only added)
# Needs: mongodump (MongoDB Database Tools), the AWS CLI, and AWS keys in .env that may write to the bucket.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
region="${S3_REGION:-ap-south-1}"

stamp=$(date -u +%Y-%m-%dT%H%MZ)
file="/tmp/shilpee-$stamp.archive.gz"
mongodump --uri="$MONGODB_URI" --archive="$file" --gzip --quiet
aws s3 cp "$file" "s3://$S3_PRIVATE_BUCKET/backups/mongo/$stamp.archive.gz" --region "$region" --only-show-errors
rm -f "$file"

if [ "${STORAGE_DRIVER:-local}" = "local" ]; then
  # No --delete: a photo removed by mistake on the server stays in the backup.
  aws s3 sync "$STORAGE_DIR" "s3://$S3_PRIVATE_BUCKET/media/" --region "$region" --only-show-errors --exclude "outbox/*"
fi

echo "$(date -Is) backup ok"
