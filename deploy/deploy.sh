#!/usr/bin/env bash
# Update the live site from GitHub. Run on the server: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
npm ci
npm run build:server   # needs MongoDB reachable: public pages are prerendered from the database; types are checked before push
pm2 reload shilpee
echo "Deployed $(git rev-parse --short HEAD)"
