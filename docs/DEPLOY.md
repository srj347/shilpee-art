# Deploy shilpeemaitra.com

One Lightsail server in Mumbai runs the site behind Nginx. MongoDB Atlas holds the data.
Images go to S3 and are served by CloudFront at `img.shilpeemaitra.com`. Amazon SES sends email.
DNS stays at Spaceship. Running cost: about $13–14 (₹1,250) a month.

Use the AWS region **ap-south-1 (Mumbai)** everywhere, except the CloudFront certificate (us-east-1).

Values used in this guide (change them if you choose other names):

| Thing | Value |
| --- | --- |
| Domain | `shilpeemaitra.com` |
| Image domain | `img.shilpeemaitra.com` |
| Sending address | `studio@shilpeemaitra.com` (no inbox; replies go to Shilpee's Gmail) |
| Public image bucket | `shilpeemaitra-media-public` |
| Private bucket (originals, backups) | `shilpeemaitra-media-private` |
| Repository | `github.com/srj347/shilpee-art` |
| Server user and folder | `ubuntu`, `/home/ubuntu/shilpee-art` |

Total time: about 3–4 hours of work, plus up to a day of waiting for SES approval.

---

## Phase 1 — Start the slow requests (day 1, 30 minutes)

### 1.1 Amazon SES: verify the domain

1. Open the AWS console. Set the region to **Asia Pacific (Mumbai)**.
2. Open **Amazon SES → Identities → Create identity**.
3. Choose **Domain**. Enter `shilpeemaitra.com`.
4. Open **Use a custom MAIL FROM domain**. Enter `mail` (this makes `mail.shilpeemaitra.com`).
5. Under **Verifying your domain**, keep **Easy DKIM** and **RSA_2048_BIT**. Keep **Publish DNS records to Route 53** off.
6. Select **Create identity**.
7. The identity page lists DNS records. Keep this page open for step 1.2.

### 1.2 Spaceship: add the SES records

1. Sign in to Spaceship. Open **Launchpad → Domain Manager → shilpeemaitra.com → Advanced DNS**.
2. Add each record below. In Spaceship, the **Host** is only the part before `.shilpeemaitra.com`.

| Type | Host | Value | Notes |
| --- | --- | --- | --- |
| CNAME | `<token1>._domainkey` | `<token1>.dkim.amazonses.com` | Copy all three DKIM records exactly from SES |
| CNAME | `<token2>._domainkey` | `<token2>.dkim.amazonses.com` | |
| CNAME | `<token3>._domainkey` | `<token3>.dkim.amazonses.com` | |
| MX | `mail` | `feedback-smtp.ap-south-1.amazonses.com`, priority `10` | For the custom MAIL FROM |
| TXT | `mail` | `v=spf1 include:amazonses.com ~all` | For the custom MAIL FROM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:maitrashilpee@gmail.com` | Start with `p=none` |

3. Wait 10–60 minutes. In SES, the identity changes to **Verified**, and DKIM to **Successful**.

### 1.3 Amazon SES: leave the sandbox

New SES accounts can only send to verified addresses ("sandbox").

1. Open **SES → Account dashboard → Request production access**.
2. Fill in:
   - Mail type: **Transactional**
   - Website URL: `https://shilpeemaitra.com`
   - Use case: "Artist portfolio site. We send (1) an email to the artist when a visitor sends an enquiry, (2) one confirmation email to that visitor, (3) one-time sign-in links to two admin users. Fewer than 500 emails a month. No marketing email, no purchased lists. Bounces and complaints are handled by removing the address."
3. Submit. Approval usually takes up to 24 hours.
4. To test before approval, verify single addresses: **Identities → Create identity → Email address** for `maitrashilpee@gmail.com` and your own email. Click the link in each email.

### 1.4 MongoDB Atlas

1. Sign up at mongodb.com/atlas. Create a project, for example `shilpee`.
2. **Create cluster → M0 (Free)**. Provider **AWS**, region **Mumbai (ap-south-1)**. If Mumbai is not offered for M0, choose Singapore.
3. **Database Access → Add new database user**: user `shilpee_app`, a long generated password, role **Read and write to any database**.
4. Keep **Network Access** for later (step 3.4); you need the server's IP first.
5. **Connect → Drivers** shows the connection string. Insert the password and add the database name:
   `mongodb+srv://shilpee_app:<password>@<cluster>.mongodb.net/shilpee?retryWrites=true&w=majority`

---

## Phase 2 — Images: S3, certificate, CloudFront (day 1, 45 minutes)

### 2.1 Two S3 buckets

1. Open **S3 → Create bucket**, region Mumbai.
2. Name `shilpeemaitra-media-public`. Keep **Block all public access** on. Turn **Bucket Versioning** on. Create.
3. Repeat for `shilpeemaitra-media-private`, with the same settings.
4. Open the private bucket → **Management → Create lifecycle rule**:
   - Name `delete-old-backups`, prefix `backups/`
   - Action **Expire current versions** after **30** days, and **Permanently delete noncurrent versions** after **1** day.

### 2.2 Certificate for img.shilpeemaitra.com

1. Switch the console region to **US East (N. Virginia) us-east-1**. CloudFront only uses certificates from there.
2. Open **Certificate Manager → Request → Request a public certificate**.
3. Domain name `img.shilpeemaitra.com`, **DNS validation**. Request.
4. Open the certificate. Copy its CNAME name and value.
5. In Spaceship Advanced DNS, add that **CNAME** (Host = the name without `.shilpeemaitra.com`).
6. Wait until the status is **Issued** (5–30 minutes).

### 2.3 CloudFront distribution

1. Open **CloudFront → Create distribution**. If the console offers pricing plans, the **Free** plan is enough to start.
2. Origin: choose the bucket `shilpeemaitra-media-public` from the list.
3. Origin access: **Origin access control settings (recommended)**. Create a new OAC with the defaults.
4. Default cache behaviour: **Redirect HTTP to HTTPS**, allowed methods **GET, HEAD**, cache policy **CachingOptimized**.
5. Web Application Firewall: **Do not enable** (not needed for images).
6. Settings: **Alternate domain name** `img.shilpeemaitra.com`. **Custom SSL certificate**: the one from step 2.2.
7. Create. On the distribution page, select **Copy policy** in the banner. Open the public bucket → **Permissions → Bucket policy → Edit**, paste, save.
8. Copy the distribution domain, for example `d1abcd.cloudfront.net`.
9. In Spaceship, add **CNAME**, Host `img`, Value `d1abcd.cloudfront.net`.

### 2.4 IAM user for the app

Lightsail servers cannot use IAM roles, so the app uses keys of a user that can do only three things.

1. Open **IAM → Policies → Create policy → JSON**. Paste:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "Uploads",
         "Effect": "Allow",
         "Action": ["s3:PutObject"],
         "Resource": [
           "arn:aws:s3:::shilpeemaitra-media-public/*",
           "arn:aws:s3:::shilpeemaitra-media-private/*"
         ]
       },
       {
         "Sid": "Email",
         "Effect": "Allow",
         "Action": ["ses:SendEmail", "ses:SendRawEmail"],
         "Resource": "*"
       }
     ]
   }
   ```

2. Name it `shilpee-app`. Create.
3. **Users → Create user** `shilpee-app` (no console access). Attach the policy `shilpee-app`.
4. Open the user → **Security credentials → Create access key → Application running outside AWS**.
5. Save the **Access key ID** and **Secret access key** in your password manager. You need them in step 4.2.

---

## Phase 3 — The server (day 1–2, 45 minutes)

### 3.1 Create the Lightsail instance

1. Open **Lightsail → Create instance**.
2. Region **Mumbai (ap-south-1)**. Platform **Linux/Unix**. Blueprint **OS only → Ubuntu 24.04 LTS**.
3. Plan: **2 GB RAM** (the build needs it). Name `shilpee`. Create.
4. **Networking → Attach static IP**. Name `shilpee-ip`. Note the IP, for example `13.235.x.x`.
5. **Networking → IPv4 firewall**: keep SSH (22), add **HTTP (80)** and **HTTPS (443)**.
6. **Snapshots → Automatic snapshots**: turn on. Lightsail keeps the last 7.

### 3.2 Point the domain at the server

In Spaceship Advanced DNS:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | the static IP |
| A | `www` | the static IP |

Remove any old A or CNAME records for `@` and `www` that Spaceship added (parking).

### 3.3 Install the software

1. Connect: Lightsail → instance → **Connect using SSH** (or download the key and use your terminal).
2. Run, one block at a time:

   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nginx git certbot python3-certbot-nginx unzip
   ```

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   node -v
   ```

   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   sudo timedatectl set-timezone Asia/Kolkata
   ```

3. Tools for backups:

   ```bash
   sudo snap install aws-cli --classic
   ```

   Download the **MongoDB Database Tools** `.deb` for **Ubuntu 24.04 x86_64** from mongodb.com/try/download/database-tools, then:

   ```bash
   sudo apt install -y ./mongodb-database-tools-*.deb
   mongodump --version
   ```

### 3.4 Allow the server in Atlas

1. Atlas → **Network Access → Add IP address**. Enter the static IP. Save.
2. Test from the server (replace the URI):

   ```bash
   npx -y mongosh "mongodb+srv://shilpee_app:<password>@<cluster>.mongodb.net/shilpee" --eval 'db.runCommand({ping:1})'
   ```

   The answer must contain `ok: 1`.

---

## Phase 4 — The app (day 2, 30 minutes)

### 4.1 Get the code

The repository is private, so give the server a read-only deploy key.

```bash
ssh-keygen -t ed25519 -C "shilpee-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

1. GitHub → `srj347/shilpee-art` → **Settings → Deploy keys → Add deploy key**. Paste the key. Leave **Allow write access** off.
2. Clone:

   ```bash
   cd /home/ubuntu
   git clone git@github.com:srj347/shilpee-art.git
   cd shilpee-art
   ```

### 4.2 Create the settings file

```bash
cp .env.example .env
openssl rand -hex 32   # run three times: SESSION_SECRET, FORM_SECRET, CRON_SECRET
nano .env
```

Set these values (leave the others as they are):

```ini
SITE_URL=https://shilpeemaitra.com
MONGODB_URI=mongodb+srv://shilpee_app:<password>@<cluster>.mongodb.net/shilpee?retryWrites=true&w=majority

SESSION_SECRET=<64 hex characters>
FORM_SECRET=<64 hex characters>
CRON_SECRET=<64 hex characters>

ADMIN_EMAILS=maitrashilpee@gmail.com,<your email>

STORAGE_DRIVER=s3
NEXT_PUBLIC_MEDIA_BASE_URL=https://img.shilpeemaitra.com
S3_REGION=ap-south-1
S3_PUBLIC_BUCKET=shilpeemaitra-media-public
S3_PRIVATE_BUCKET=shilpeemaitra-media-private
AWS_ACCESS_KEY_ID=<from step 2.4>
AWS_SECRET_ACCESS_KEY=<from step 2.4>

MAIL_DRIVER=ses
MAIL_FROM="Shilpee Maitra <studio@shilpeemaitra.com>"
SES_REGION=ap-south-1

NEXT_PUBLIC_UMAMI_WEBSITE_ID=
```

Remove the `#` in front of the two `AWS_` lines. Then protect the file:

```bash
chmod 600 .env
```

`NEXT_PUBLIC_*` values are built into the pages. If you change them later, build again.

### 4.3 Build and start

```bash
npm ci
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup        # it prints one sudo command: copy it and run it
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

The last command must print `200`. If the build fails with a MongoDB error, check step 3.4.

---

## Phase 5 — Nginx and HTTPS (day 2, 15 minutes)

Wait until the domain points at the server: `dig +short shilpeemaitra.com` on your computer must print the static IP.

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/shilpee
sudo ln -s /etc/nginx/sites-available/shilpee /etc/nginx/sites-enabled/shilpee
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d shilpeemaitra.com -d www.shilpeemaitra.com --redirect -m <your email> --agree-tos -n
sudo certbot renew --dry-run
```

Open `https://shilpeemaitra.com`. The site shows with no work yet ("New work is on its way").

---

## Phase 6 — Jobs and monitoring (day 2, 15 minutes)

1. Add the cron jobs:

   ```bash
   crontab -e
   ```

   Paste the two lines from `deploy/crontab.txt`. Save.

2. Test the backup once:

   ```bash
   ./deploy/backup.sh && echo OK
   aws s3 ls s3://shilpeemaitra-media-private/backups/mongo/ --region ap-south-1
   ```

   (The script reads the AWS keys from `.env`.)

3. Test the email retry job:

   ```bash
   curl -s -X POST -H "Authorization: Bearer $(grep ^CRON_SECRET= .env | cut -d= -f2)" http://127.0.0.1:3000/api/cron/mail-retry
   ```

   The answer is `{"tried":0}`.

4. UptimeRobot (free): add an **HTTP(s)** monitor for `https://shilpeemaitra.com`, every 5 minutes, alerts to your email.

---

## Phase 7 — Check everything before you share the link (day 2–3)

1. **Studio sign-in.** Open `https://shilpeemaitra.com/admin`, enter `maitrashilpee@gmail.com`. The sign-in email arrives (check spam the first time). While SES is in the sandbox, this works only for verified addresses (step 1.3).
2. **Settings.** In Studio → Settings, check the contact details, write the About text, add her portrait. Save.
3. **First work from a phone.** On Shilpee's iPhone, add a work with 2–3 photos. Check:
   - the photos upload and show (this proves S3, CloudFront and the iPhone photo format);
   - after **Put on website**, the work shows on `https://shilpeemaitra.com/works`.
4. **Enquiry.** From another phone, send an enquiry on that work. Check:
   - Shilpee gets "New enquiry …", and **Reply** goes to the visitor;
   - the visitor gets "Thank you for asking about …", and replying to it goes to `maitrashilpee@gmail.com`;
   - the enquiry is in Studio → Enquiries.
5. **Link previews.** Send a work link in WhatsApp and in an Instagram DM. The painting must show in the preview.
6. **Instagram.** Open the site from a link in an Instagram DM (the in-app browser). Test the viewer and the enquiry sheet.
7. **Mail quality.** Send one enquiry to a Gmail address. In Gmail, open **⋮ → Show original**: SPF, DKIM and DMARC must say **PASS**.
8. **Search.** Google Search Console → **Add property → Domain** `shilpeemaitra.com`. Add the TXT record it gives in Spaceship. Then **Sitemaps → submit** `https://shilpeemaitra.com/sitemap.xml`.
9. **Go live.** Put `https://shilpeemaitra.com` in the Instagram bio.

---

## Updates later

On your computer: commit and push to `main`. On the server:

```bash
cd /home/ubuntu/shilpee-art && ./deploy/deploy.sh
```

It pulls, installs, builds (the build reads MongoDB) and reloads PM2 with no downtime.

## If something goes wrong

| Problem | Check |
| --- | --- |
| Site down | `pm2 status`, `pm2 logs shilpee --lines 100`, `sudo systemctl status nginx` |
| Build fails with a database error | Atlas Network Access has the static IP; `MONGODB_URI` is correct |
| Photos fail to upload | `pm2 logs shilpee`; IAM keys in `.env`; bucket names; `client_max_body_size` in Nginx |
| Photos upload but do not show | CloudFront bucket policy (step 2.3, point 7); CNAME `img`; `NEXT_PUBLIC_MEDIA_BASE_URL`, then build again |
| No emails | SES identity verified; production access granted; `MAIL_DRIVER=ses`; Studio → Enquiries shows "did not send yet" |
| Sign-in link says expired | Links work once, for 15 minutes; ask for a new one |

## Restore a backup

```bash
aws s3 cp s3://shilpeemaitra-media-private/backups/mongo/<file>.archive.gz /tmp/restore.gz --region ap-south-1
mongorestore --uri="$MONGODB_URI" --archive=/tmp/restore.gz --gzip --drop
```

A deleted work is not erased: it has `deletedAt` set. To bring it back, unset `deletedAt` in the database.
