# Shilpee Maitra — portfolio and enquiry site

A gallery-style website for Shilpee Maitra's paintings and prints, with "Studio", a phone-first admin.
Visitors enquire about a work; nothing is sold through a checkout.

- Public site: Home, Works, Upcoming, Prints, work pages, About, Contact, Privacy
- Studio (`/admin`): works, photos, prints, enquiries, settings
- Stack: Next.js 16 (App Router, Cache Components), MongoDB, sharp, Amazon SES. Images live on the server's disk
  (served by Caddy, which also handles HTTPS); S3 + CloudFront is supported by configuration only (`STORAGE_DRIVER=s3`)
- Plan and design system: the "Shilpee Maitra Site Plan" artifact

## Run it on your computer

Requirements: Node 24, Docker.

1. Start the database (MongoDB on port 27018, apart from any other MongoDB):

   ```bash
   docker compose up -d
   ```

2. Create `.env.local` from `.env.example`. For local work you need `MONGODB_URI`, the three secrets and `ADMIN_EMAILS`:

   ```bash
   cp .env.example .env.local
   ```

3. Install and add sample works (generated abstract images, tagged `sample`):

   ```bash
   npm install
   npm run seed:sample
   ```

4. Start the site at http://localhost:3000:

   ```bash
   npm run dev
   ```

5. Sign in to Studio at http://localhost:3000/admin with an email from `ADMIN_EMAILS`.
   Locally, emails are not sent: they are written to `storage/outbox/`. Open the newest `.txt` file and use its link.

To remove the sample works later:

```bash
npm run seed:sample -- --clear
```

## Tests

```bash
npm test            # unit tests (formatting, image sizes, selectors, spam checks)
npm run typecheck   # run before every push: the server build skips this check
npm run lint
npm run test:e2e    # needs the dev server running; uses your installed Google Chrome
```

The end-to-end tests sign in, add and publish a work with a photo, use the quick actions, drag to reorder,
delete, send enquiries (original, print, contact form), check the spam rules and the emails, and use the viewer.
Set `BASE=http://localhost:3100` to run them against `next start` on another port.

## How it fits together

| Area | Where |
| --- | --- |
| Public pages | `src/app/(site)/` |
| Studio pages | `src/app/admin/` (signed-in pages in `(studio)/`) |
| API | `src/app/api/` — `admin/*` needs a session; `enquiries` is public |
| Cached reads for the site | `src/lib/data.ts` (`'use cache'`, tags `artworks` and `settings`) |
| Studio writes | `src/lib/studio.ts` — every write refreshes the public pages at once |
| Image pipeline | `src/lib/images.ts` — sRGB, no GPS, AVIF + WebP sizes, blur preview, 1200×630 social image |
| Image storage | `src/lib/storage.ts` — `local` (disk, `STORAGE_DIR`) or `s3`; `deploy/media-to-s3.sh` moves disk → S3 |
| Enquiries and email | `src/lib/enquiries.ts`, `src/lib/mail.ts`, `src/lib/mail-templates.ts` |
| Design tokens | top of `src/app/globals.css` |
| Gestures | `src/components/art/Viewer.tsx` (swipe, pinch, double-tap, pan, drag down), `EnquirySheet.tsx` (drag down) |

Things to know:

- Next.js keeps earlier pages in the document as hidden copies. Do not look up elements with
  `document.getElementById` across the page; scope lookups to a component's own root (see `StickyEnquire.tsx`).
- Run one server process only: rate limits and the page cache live in memory.
- Mongoose: do not wrap `mongoose.model` in a generic helper; TypeScript runs out of memory (see `models.ts`).
- iPhones save photos as HEIC. The upload field accepts JPEG/PNG/WebP only, so iOS converts to JPEG. Test on a real iPhone.

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md). Studio guide for Shilpee: [docs/STUDIO-GUIDE.md](docs/STUDIO-GUIDE.md).
