#!/usr/bin/env bash
# Nightly MongoDB backup to the private S3 bucket. Run from cron (see crontab.txt).
# Needs: mongodump (MongoDB Database Tools), AWS CLI with an IAM role or keys that can write to the bucket.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
stamp=$(date -u +%Y-%m-%dT%H%MZ)
file="/tmp/shilpee-$stamp.archive.gz"
mongodump --uri="$MONGODB_URI" --archive="$file" --gzip --quiet
aws s3 cp "$file" "s3://$S3_PRIVATE_BUCKET/backups/mongo/$stamp.archive.gz" --only-show-errors
rm -f "$file"
# Keep 30 days: set a lifecycle rule on backups/ in the bucket (see docs/DEPLOY.md).
