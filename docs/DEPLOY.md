# Deploy to AWS Lightsail (Mumbai)

Target: one Lightsail instance runs Next.js behind Nginx. MongoDB Atlas holds the data.
Images go to an S3 bucket behind CloudFront. Amazon SES sends email. About $14 (₹1,250) a month.

Do the steps in this order. Steps 1 and 4 take time on AWS's side, so start them first.

## 1. Accounts and requests to start early

1. Buy the domain (for example `shilpeemaitra.com`).
2. Amazon SES, region **ap-south-1 (Mumbai)**:
   1. Create a domain identity for the domain. Add the DKIM CNAME records it shows.
   2. Add an SPF record: `v=spf1 include:amazonses.com ~all`.
   3. Add a DMARC record: `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<your email>`.
   4. Request production access (leaves the sandbox). Approval can take a day or more.
3. MongoDB Atlas: create a free M0 cluster in AWS Mumbai. Create a database user.
   Allow the Lightsail static IP (step 2) in Network Access. Copy the connection string.

## 2. Lightsail instance

1. Create an instance: Linux, Ubuntu 24.04 LTS, region Mumbai, the 2 GB RAM plan.
2. Attach a static IP. Point the domain's A records (`@` and `www`) to it.
3. Open ports 80 and 443 in the instance firewall (22 is open by default).
4. Turn on automatic snapshots (keep 7).
5. Connect with SSH and install the software:

   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nginx certbot python3-certbot-nginx git
   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt install -y nodejs
   sudo npm i -g pm2
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## 3. S3 and CloudFront for images

1. Create two S3 buckets in ap-south-1, both with "Block all public access" on:
   - `shilpee-media-public` — the image sizes (`img/...`), served by CloudFront
   - `shilpee-media-private` — full-size masters and database backups
2. Turn on versioning for both buckets.
3. On the private bucket, add a lifecycle rule: delete objects under `backups/` after 30 days.
4. Create a CloudFront distribution:
   - Origin: the public bucket, with **Origin Access Control** (CloudFront updates the bucket policy).
   - Alternate domain name: `img.shilpeemaitra.com`, with a certificate from ACM in **us-east-1**.
   - Cache policy: CachingOptimized. The files never change, so no invalidations are needed.
5. Add a CNAME `img` → the CloudFront domain.
6. Create an IAM user (or a role for the instance) with only these permissions:
   `s3:PutObject` on both buckets, `ses:SendEmail` for the domain identity.

## 4. The app

```bash
cd /home/ubuntu
git clone <your repository> shilpee-art && cd shilpee-art
cp .env.example .env
nano .env
```

Fill in `.env`:

| Setting | Value |
| --- | --- |
| `SITE_URL` | `https://shilpeemaitra.com` |
| `MONGODB_URI` | the Atlas connection string, database name `shilpee` |
| `SESSION_SECRET`, `FORM_SECRET`, `CRON_SECRET` | each `openssl rand -hex 32` |
| `ADMIN_EMAILS` | Shilpee's email and yours |
| `STORAGE_DRIVER` | `s3` |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | `https://img.shilpeemaitra.com` |
| `S3_PUBLIC_BUCKET`, `S3_PRIVATE_BUCKET`, `S3_REGION` | the two buckets, `ap-south-1` |
| `MAIL_DRIVER` | `ses` |
| `MAIL_FROM` | `Shilpee Maitra <studio@shilpeemaitra.com>` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | the IAM user's keys (not needed with an instance role) |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | optional, from Umami Cloud |

`NEXT_PUBLIC_*` values are built into the pages, so rebuild after you change them.

Build and start:

```bash
npm ci
npm run build
pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
```

## 5. Nginx and HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/shilpee
sudo ln -s /etc/nginx/sites-available/shilpee /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d shilpeemaitra.com -d www.shilpeemaitra.com
```

## 6. Jobs and monitoring

1. Install the MongoDB Database Tools (for `mongodump`) and the AWS CLI.
2. Add the two lines from `deploy/crontab.txt` with `crontab -e`.
3. Run the backup once by hand and check the file in S3: `./deploy/backup.sh`.
4. Create a free UptimeRobot check for `https://shilpeemaitra.com` (every 5 minutes, email alert).

## 7. Before launch

1. Sign in to Studio. In Settings, fill in the About text, contact email, WhatsApp number and Instagram link.
2. Add the real works. Remove the sample works if you added them:
   `npx tsx --env-file=.env scripts/seed-sample.ts --clear`
3. Send a test enquiry from a phone. Check both emails arrive (and not in spam).
4. Paste a work link into WhatsApp and Instagram DMs. Check the preview image shows.
5. Open the site in the Instagram in-app browser.
6. Register the site in Google Search Console and submit `https://shilpeemaitra.com/sitemap.xml`.

## Updates

```bash
./deploy/deploy.sh
```

It pulls, installs, builds and reloads PM2. The build reads MongoDB, so the database must be reachable.

## Restore a backup

```bash
aws s3 cp s3://shilpee-media-private/backups/mongo/<file>.archive.gz /tmp/restore.gz
mongorestore --uri="$MONGODB_URI" --archive=/tmp/restore.gz --gzip --drop
```

A deleted work is not erased: it has `deletedAt` set. To restore it, unset `deletedAt` in the database.
