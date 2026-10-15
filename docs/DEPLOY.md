# Deploy shilpeemaitra.com

One Lightsail server runs the site behind Nginx and keeps the images on its own disk.
MongoDB Atlas holds the data. Amazon SES sends email. DNS stays at Spaceship.
Running cost: about $12–13 (₹1,150) a month.

Backups: for now only Lightsail's automatic snapshots (7 days). The nightly database and image backup to S3
is ready to turn on later; see "Later: nightly backups to S3".

Images can move to S3 + CloudFront later without code changes; see "Later: images on S3 and CloudFront" at the end.

## Values used in this guide

| Thing | Value |
| --- | --- |
| Domain | `shilpeemaitra.com` (DNS at Spaceship) |
| Server | Lightsail, Ubuntu 24.04, 2 GB plan, region **Mumbai** (closest to visitors in India) |
| Image folder on the server | `/srv/shilpee-media` (served by Nginx at `/media/img/…`) |
| Email | Amazon SES, region **Sydney** (`ap-southeast-2`), sending from `studio@shilpeemaitra.com` |
| Database | Atlas cluster `shilpee-art-cluster`, user `ops_db_user`, database `shilpee` |
| Repository | `github.com/srj347/shilpee-art` |

Status on 15 October 2026: domain bought, SES domain records added and resolving, Atlas cluster and user created.

---

## Phase 1 — Email (SES, Sydney)

1. **Identities → shilpeemaitra.com** must show: identity **Verified**, DKIM **Successful**, custom MAIL FROM **Successful**.
   The DNS records are in Spaceship already (3 DKIM CNAMEs, MX and TXT for `mail`, TXT `_dmarc`).
2. **Identities → Create identity → Email address**: verify `maitrashilpee@gmail.com` and your own email.
   While the account is in the sandbox, SES sends only to verified addresses.
3. **Account dashboard → Request production access** (in Sydney):
   - Mail type: **Transactional**; website: `https://shilpeemaitra.com`
   - Use case: "Artist portfolio site. We send (1) an email to the artist when a visitor sends an enquiry, (2) one confirmation email to that visitor, (3) one-time sign-in links to two admin users. Fewer than 500 emails a month. No marketing email, no purchased lists. Bounces and complaints are handled by removing the address."
   - Done when the yellow "sandbox" banner is gone.
4. Leave **engagement tracking** (open and click tracking) off. It rewrites links, including the one-time sign-in link.

## Phase 2 — The app's AWS user, for email (10 minutes)

Lightsail servers cannot use IAM roles, so the app sends email with the keys of a user that can only send email.

1. **IAM → Policies → Create policy → JSON**. Paste:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       { "Sid": "Email", "Effect": "Allow", "Action": ["ses:SendEmail", "ses:SendRawEmail"], "Resource": "*" }
     ]
   }
   ```

2. Name it `shilpee-app` → **Create policy**.
3. **Users → Create user** `shilpee-app`, no console access → **Attach policies directly** → `shilpee-app` → **Create user**.
4. User → **Security credentials → Create access key → Application running outside AWS**.
   Save the **Access key ID** and **Secret access key** in your password manager (the secret is shown once).

The S3 buckets and the CloudFront distribution are not used. You can delete them, or leave them empty.

## Phase 3 — The server (45 minutes)

### 3.1 Lightsail instance

1. **Lightsail → Create instance**. Region **Mumbai (ap-south-1)**, **Linux/Unix → OS only → Ubuntu 24.04 LTS**, plan **2 GB RAM**, name `shilpee`.
   (If your account cannot use Mumbai, Sydney works; pages are a little slower from India.)
2. **Networking → Attach static IP** `shilpee-ip`. Note the IP.
3. **Networking → IPv4 firewall**: SSH (22), **HTTP (80)**, **HTTPS (443)**.
4. **Snapshots → Automatic snapshots**: on (keeps 7 days; these include the images).

### 3.2 Domain → server

Spaceship → `shilpeemaitra.com` → DNS. Add, with **TTL 5 min** for now:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | the static IP |
| A | `www` | the static IP |

Delete any parking A or CNAME records for `@` and `www`. Leave the SES records alone.

### 3.3 Atlas access

Atlas → **Network Access → Add IP address** → the static IP → Confirm.

### 3.4 Software

Connect: Lightsail → instance → **Connect using SSH**. Run one block at a time.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git certbot python3-certbot-nginx unzip
sudo timedatectl set-timezone Asia/Kolkata
```

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v
```

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

The image folder (Nginx reads `public`; only the app reads `private`):

```bash
sudo mkdir -p /srv/shilpee-media/public /srv/shilpee-media/private
sudo chown -R ubuntu:ubuntu /srv/shilpee-media
chmod 755 /srv/shilpee-media /srv/shilpee-media/public
chmod 700 /srv/shilpee-media/private
```

`mongosh`, to test the database connection, from MongoDB's own package repository:

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update && sudo apt install -y mongodb-mongosh
```

Test the database connection (use the real password):

```bash
mongosh "mongodb+srv://ops_db_user:<password>@shilpee-art-cluster.lquynpx.mongodb.net/shilpee" --eval 'db.runCommand({ping:1})'
```

It must print `ok: 1`. If it hangs, check step 3.3.

## Phase 4 — The app (30 minutes)

### 4.1 Code

```bash
ssh-keygen -t ed25519 -C "shilpee-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

GitHub → `srj347/shilpee-art` → **Settings → Deploy keys → Add deploy key** → paste → leave **Allow write access** off. Then:

```bash
cd /home/ubuntu
git clone git@github.com:srj347/shilpee-art.git
cd shilpee-art
```

### 4.2 Settings file

```bash
cp .env.example .env
openssl rand -hex 32    # run 3 times, one value each for the 3 secrets
nano .env
```

Make `.env` look like this (keep the other lines as they are):

```ini
SITE_URL=https://shilpeemaitra.com
MONGODB_URI=mongodb+srv://ops_db_user:<password>@shilpee-art-cluster.lquynpx.mongodb.net/shilpee?retryWrites=true&w=majority

SESSION_SECRET=<64 hex characters>
FORM_SECRET=<64 hex characters>
CRON_SECRET=<64 hex characters>

ADMIN_EMAILS=maitrashilpee@gmail.com,<your email>

STORAGE_DRIVER=local
STORAGE_DIR=/srv/shilpee-media
NEXT_PUBLIC_MEDIA_BASE_URL=/media
S3_PUBLIC_BUCKET=
S3_PRIVATE_BUCKET=
AWS_ACCESS_KEY_ID=<from Phase 2>
AWS_SECRET_ACCESS_KEY=<from Phase 2>

MAIL_DRIVER=ses
MAIL_FROM="Shilpee Maitra <studio@shilpeemaitra.com>"
SES_REGION=ap-southeast-2

NEXT_PUBLIC_UMAMI_WEBSITE_ID=
```

- Remove the `#` in front of the two `AWS_` lines.
- `SES_REGION` is where SES is set up (Sydney). The `S3_` settings stay empty: images are on the server's disk.
- If the database password contains `@ : / ? # [ ] %`, write it URL-encoded (for example `@` → `%40`).

```bash
chmod 600 .env
```

`NEXT_PUBLIC_*` values are built into the pages. After changing them, build again.

### 4.3 Build and start

```bash
npm ci
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup          # prints one sudo command: copy it and run it
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

The last line must print `200`.

## Phase 5 — Nginx and HTTPS (15 minutes)

On your Mac, `dig +short shilpeemaitra.com` must print the static IP first. Then on the server:

```bash
cd /home/ubuntu/shilpee-art
sudo cp deploy/nginx.conf /etc/nginx/sites-available/shilpee
sudo ln -s /etc/nginx/sites-available/shilpee /etc/nginx/sites-enabled/shilpee
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d shilpeemaitra.com -d www.shilpeemaitra.com --redirect -m <your email> --agree-tos -n
sudo certbot renew --dry-run
```

Open `https://shilpeemaitra.com`. It shows the site with no works yet.

When the site works, raise the TTL of the two A records in Spaceship to 60 min.

## Phase 6 — Email retry job and monitoring (10 minutes)

1. `crontab -e` (choose `nano` if asked). Paste this one line at the end, save and exit:

   ```
   */10 * * * * curl -s -X POST -H "Authorization: Bearer $(grep ^CRON_SECRET= /home/ubuntu/shilpee-art/.env | cut -d= -f2)" http://127.0.0.1:3000/api/cron/mail-retry > /dev/null
   ```

   It resends enquiry emails that failed, every 10 minutes. (Leave out the backup line in `deploy/crontab.txt` for now.)
2. Test it:

   ```bash
   cd /home/ubuntu/shilpee-art
   curl -s -X POST -H "Authorization: Bearer $(grep ^CRON_SECRET= .env | cut -d= -f2)" http://127.0.0.1:3000/api/cron/mail-retry
   ```

   Answer: `{"tried":0}`.
3. UptimeRobot (free): HTTP(s) monitor for `https://shilpeemaitra.com`, every 5 minutes, email alerts.

## Phase 7 — Checks before you share the link

1. **Studio sign-in**: `https://shilpeemaitra.com/admin` → `maitrashilpee@gmail.com` → the email arrives (check spam the first time).
2. **Settings**: check the contact details, write the About text, add the portrait, save.
3. **First work from Shilpee's iPhone**: add a work with 2–3 photos, **Put on website**. The photos show on `/works`.
   On the server, `ls /srv/shilpee-media/public/img | head` lists new folders.
4. **Enquiry** from another phone: Shilpee gets "New enquiry …" (Reply goes to the visitor); the visitor gets "Thank you …" (Reply goes to Shilpee's Gmail); it shows in Studio → Enquiries.
5. **Link previews**: send a work link on WhatsApp and in an Instagram DM. The painting shows in the preview.
6. **Instagram in-app browser**: open the site from a DM link. Try the viewer and the enquiry sheet.
7. **Email checks**: in Gmail, **⋮ → Show original** on a site email: SPF, DKIM, DMARC say **PASS**.
8. **Google Search Console**: add the domain property, add its TXT record in Spaceship, submit `https://shilpeemaitra.com/sitemap.xml`.
9. **Instagram bio**: `https://shilpeemaitra.com`.

---

## Updates later

Push to `main` from your computer. On the server:

```bash
cd /home/ubuntu/shilpee-art && ./deploy/deploy.sh
```

Images in `/srv/shilpee-media` are outside the code folder, so updates never touch them.

## Where things are on the server

| What | Where |
| --- | --- |
| Code | `/home/ubuntu/shilpee-art` |
| Settings | `/home/ubuntu/shilpee-art/.env` |
| Public image sizes | `/srv/shilpee-media/public/img/<id>/` |
| Full-size originals | `/srv/shilpee-media/private/masters/` |
| App logs | `pm2 logs shilpee` |

## If something goes wrong

| Problem | Check |
| --- | --- |
| Site down | `pm2 status`, `pm2 logs shilpee --lines 100`, `sudo systemctl status nginx` |
| Build fails with a database error | Atlas Network Access has the static IP; `MONGODB_URI` and the password encoding |
| Photo upload fails | `pm2 logs shilpee`; `ls -ld /srv/shilpee-media/*` (owner `ubuntu`); `STORAGE_DIR` in `.env` |
| Photos upload but do not show | `sudo nginx -t`; the `/media/img/` block in `/etc/nginx/sites-available/shilpee`; `chmod 755 /srv/shilpee-media /srv/shilpee-media/public` |
| No emails | SES identity verified and out of the sandbox; `MAIL_DRIVER=ses`, `SES_REGION=ap-southeast-2`; Studio → Enquiries shows "did not send yet" |
| Disk filling up | `df -h /`. The 2 GB plan has 60 GB; thousands of photos fit |

## Restore

Restore the whole server from a Lightsail snapshot: **Lightsail → Snapshots → ⋮ → Create new instance**, then attach the static IP to the new instance. A snapshot holds the code, `.env` and the images; the database is in Atlas.

A deleted work is not erased: it has `deletedAt` set. Unset it in the database to bring the work back.

---

## Later: nightly backups to S3

Turn this on before Shilpee adds many works: the free Atlas M0 cluster has no automatic backups.

1. Create a private S3 bucket (block all public access, versioning on). Add a lifecycle rule: prefix `backups/`, expire current versions after 30 days, delete noncurrent versions after 1 day.
2. Add to the IAM policy (with the exact bucket name):

   ```json
   { "Sid": "BackupWrite", "Effect": "Allow", "Action": ["s3:PutObject"], "Resource": "arn:aws:s3:::<bucket>/*" },
   { "Sid": "BackupList",  "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::<bucket>" }
   ```

3. On the server: install the tools, then set the bucket in `.env`:

   ```bash
   sudo snap install aws-cli --classic
   sudo apt install -y mongodb-database-tools
   nano .env     # S3_PRIVATE_BUCKET=<bucket>, S3_REGION=<bucket region>
   ./deploy/backup.sh && echo OK
   ```

4. `crontab -e` and add the backup line from `deploy/crontab.txt` (every night at 03:00).

Restore the database from a backup:

```bash
aws s3 cp "s3://<bucket>/backups/mongo/<file>.archive.gz" /tmp/restore.gz --region <bucket region>
mongorestore --uri="$MONGODB_URI" --archive=/tmp/restore.gz --gzip --drop
```

Restore the images: `aws s3 sync "s3://<bucket>/media/" /srv/shilpee-media/ --region <bucket region>`.

---

## Later: images on S3 and CloudFront

Do this only when AWS Support has enabled CloudFront, if you want faster images abroad.

1. Create the CloudFront distribution for the public bucket (Origin Access Control), add `img.shilpeemaitra.com` with its certificate, and add the `img` CNAME in Spaceship.
2. Add `s3:PutObject` on the public and private buckets to the IAM policy, and set `S3_REGION` to the buckets' region in `.env`.
3. In `.env`, set `S3_PUBLIC_BUCKET=<exact public bucket name>`. Then copy the images:

   ```bash
   ./deploy/media-to-s3.sh
   ```

4. In `.env`: `STORAGE_DRIVER=s3` and `NEXT_PUBLIC_MEDIA_BASE_URL=https://img.shilpeemaitra.com`. Then `./deploy/deploy.sh`.
5. Check a few works. Image addresses are not stored in the database, so every image switches at once.
6. Keep `/srv/shilpee-media` for a few weeks, then delete it.
