// Development data: sample works with generated abstract images.
//   npm run seed:sample          add samples (replaces earlier samples)
//   npm run seed:sample -- --clear   remove samples only
// Samples carry the tag "sample" so they never mix with real works.
import mongoose from 'mongoose'
import sharp from 'sharp'
import { dbConnect } from '@/lib/db'
import { processImage } from '@/lib/images'
import { ArtworkModel, CounterModel, SettingsModel } from '@/lib/models'
import { DEFAULT_SETTINGS } from '@/lib/defaults'
import { slugify } from '@/lib/format'

type Spec = {
  title: string
  year: number
  medium: string
  tags: ('acrylic' | 'watercolour' | 'mixed-media' | 'ink')[]
  support: 'canvas' | 'paper'
  h: number
  w: number
  availability: 'available' | 'reserved' | 'sold' | 'upcoming'
  price?: number
  palette: string[]
  featured?: boolean
  hero?: boolean
  prints?: 'paper' | 'canvas'
  series?: string
  expected?: string
}

const SPECS: Spec[] = [
  { title: 'Monsoon Grey', year: 2026, medium: 'Acrylic and watercolour on canvas', tags: ['acrylic', 'watercolour'], support: 'canvas', h: 90, w: 120, availability: 'available', price: 180000, palette: ['#6E7C80', '#9AA6A6', '#D8D2C4', '#3E4A4F'], featured: true, hero: true, prints: 'paper', series: 'Monsoon' },
  { title: 'Salt Field', year: 2025, medium: 'Watercolour on cotton paper', tags: ['watercolour'], support: 'paper', h: 76, w: 56, availability: 'reserved', price: 42000, palette: ['#F2EEE6', '#C9C2B4', '#9DB0B3', '#E5D9C3'], featured: true },
  { title: 'Afternoon Stone', year: 2025, medium: 'Acrylic on canvas', tags: ['acrylic'], support: 'canvas', h: 122, w: 91, availability: 'sold', price: 210000, palette: ['#8A4E3E', '#C08A5B', '#E2C9A6', '#4A2E28'], featured: true, prints: 'canvas' },
  { title: 'Turmeric Hour', year: 2024, medium: 'Mixed media on canvas', tags: ['mixed-media', 'acrylic'], support: 'canvas', h: 60, w: 60, availability: 'available', price: 65000, palette: ['#B08A52', '#E3B65B', '#F3E3BC', '#6B4F2A'], featured: true, prints: 'paper' },
  { title: 'First Rain', year: 2026, medium: 'Acrylic and watercolour on canvas', tags: ['acrylic', 'watercolour'], support: 'canvas', h: 122, w: 183, availability: 'available', palette: ['#4F6670', '#8FA3A8', '#CFD6D1', '#26343A'], featured: true, series: 'Monsoon' },
  { title: 'Deccan Light', year: 2025, medium: 'Acrylic on canvas', tags: ['acrylic'], support: 'canvas', h: 76, w: 102, availability: 'available', price: 120000, palette: ['#C9A46A', '#E8D5B0', '#9C7A4A', '#F6EEDC'], featured: true, prints: 'canvas' },
  { title: 'Night Garden', year: 2024, medium: 'Ink and watercolour on paper', tags: ['ink', 'watercolour'], support: 'paper', h: 40, w: 30, availability: 'available', price: 18000, palette: ['#2E3B36', '#5F7A6A', '#A9BFA8', '#151C19'], prints: 'paper' },
  { title: 'Lake Edge', year: 2025, medium: 'Watercolour on cotton paper', tags: ['watercolour'], support: 'paper', h: 56, w: 76, availability: 'available', price: 38000, palette: ['#A7BCC2', '#E4ECEA', '#6F8E96', '#D7CFC0'] },
  { title: 'Clay Study II', year: 2024, medium: 'Mixed media on board', tags: ['mixed-media'], support: 'canvas', h: 30, w: 30, availability: 'sold', price: 15000, palette: ['#9A5B43', '#D49B79', '#EFD8C4', '#5E3426'] },
  { title: 'Wet Stone', year: 2026, medium: 'Acrylic on canvas', tags: ['acrylic'], support: 'canvas', h: 100, w: 100, availability: 'available', price: 150000, palette: ['#5C6466', '#9EA4A1', '#D9D6CF', '#33393B'], series: 'Monsoon' },
  { title: 'Kite Season', year: 2025, medium: 'Acrylic and ink on canvas', tags: ['acrylic', 'ink'], support: 'canvas', h: 50, w: 70, availability: 'available', price: 48000, palette: ['#C2423A', '#E9B7A0', '#F4EBDD', '#2E2B2A'], prints: 'paper' },
  { title: 'Banyan, Morning', year: 2026, medium: 'Acrylic and watercolour on canvas', tags: ['acrylic', 'watercolour'], support: 'canvas', h: 152, w: 122, availability: 'upcoming', palette: ['#6A7A5A', '#A8B58E', '#E2E4CF', '#3C4633'], expected: '2026-12' },
  { title: 'Ochre Field (working title)', year: 2026, medium: 'Acrylic on canvas', tags: ['acrylic'], support: 'canvas', h: 90, w: 90, availability: 'upcoming', palette: ['#B98A47', '#E1C08A', '#F4E6CB', '#6E4E25'], expected: '2027-01' },
]

function rand(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** A soft abstract "painting": washes, bands and a paper-like texture. */
async function paint(spec: Spec, seed: number): Promise<Buffer> {
  const long = 1800
  const W = spec.w >= spec.h ? long : Math.round((long * spec.w) / spec.h)
  const H = spec.h >= spec.w ? long : Math.round((long * spec.h) / spec.w)
  const r = rand(seed * 977 + 13)
  const [bg, ...rest] = spec.palette
  const shapes: string[] = []
  for (let i = 0; i < 9; i++) {
    const c = rest[i % rest.length]
    const cx = r() * W, cy = r() * H, rx = W * (0.15 + r() * 0.45), ry = H * (0.05 + r() * 0.3)
    shapes.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${0.25 + r() * 0.45}" filter="url(#soft)"/>`)
  }
  for (let i = 0; i < 3; i++) {
    const y = r() * H
    shapes.push(`<rect x="0" y="${y}" width="${W}" height="${H * (0.01 + r() * 0.05)}" fill="${rest[(i + 1) % rest.length]}" opacity="${0.35 + r() * 0.4}" filter="url(#edge)"/>`)
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${long / 30}"/></filter>
      <filter id="edge"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="40"/><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.10"/></feComponentTransfer></filter>
    </defs>
    <rect width="100%" height="100%" fill="${bg}"/>
    ${shapes.join('\n')}
    <rect width="100%" height="100%" filter="url(#grain)"/>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
}

/** A plain "digital preview" room: wall, floor line, the work at scale. */
async function room(work: Buffer, spec: Spec): Promise<Buffer> {
  const W = 1800, H = 1200
  const pxPerCm = 3.2
  const w = Math.round(spec.w * pxPerCm), h = Math.round(spec.h * pxPerCm)
  const centreY = H - 150 - Math.round(150 * pxPerCm * 0.62)
  const art = await sharp(work).resize(w, h, { fit: 'fill' }).toBuffer()
  const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="#EDEAE4"/><rect y="${H - 150}" width="100%" height="150" fill="#CDBFAE"/>
    <rect x="${W / 2 - 330}" y="${H - 330}" width="660" height="190" rx="18" fill="#8F8A80"/></svg>`)
  return sharp(base)
    .composite([{ input: art, left: Math.round(W / 2 - w / 2), top: Math.max(40, centreY - Math.round(h / 2)) }])
    .jpeg({ quality: 88 })
    .toBuffer()
}

async function detail(work: Buffer): Promise<Buffer> {
  const m = await sharp(work).metadata()
  const cw = Math.round(m.width! * 0.35), ch = Math.round(m.height! * 0.35)
  return sharp(work).extract({ left: Math.round(m.width! * 0.5), top: Math.round(m.height! * 0.4), width: cw, height: ch }).resize(1600).jpeg({ quality: 90 }).toBuffer()
}

async function main() {
  await dbConnect()
  const removed = await ArtworkModel.deleteMany({ tags: 'sample' })
  console.log(`Removed ${removed.deletedCount} sample works`)
  if (process.argv.includes('--clear')) return

  const settings = await SettingsModel.findOne({ key: 'site' })
  if (!settings) {
    await SettingsModel.create({
      key: 'site',
      data: {
        ...DEFAULT_SETTINGS,
        about:
          'Sample text. Replace it in Studio → Settings.\n\nI paint large abstract works in acrylic and watercolour in my studio in Hyderabad. I start with thin washes and build the surface in layers, scraping back while the paint is still wet, so the canvas shows through.\n\nMost works begin with a walk: the colour of wet stone after rain, the light on the Deccan rocks in the late afternoon.',
        cv: [
          { year: '2026', text: 'Sample entry: group show, Hyderabad' },
          { year: '2025', text: 'Sample entry: residency' },
        ],
        contact: { email: 'studio@example.test', whatsapp: '910000000000', instagram: 'https://www.instagram.com/', replyPromise: 'within two working days' },
        notifyEmails: ['studio@example.test'],
      },
    })
    console.log('Created settings with sample text')
  }

  let order = 0
  for (const [i, spec] of SPECS.entries()) {
    const main = await paint(spec, i + 1)
    const images = [await processImage(main, { role: spec.availability === 'upcoming' ? 'wip' : 'main', alt: `${spec.title}: abstract washes in ${spec.palette.length} tones` })]
    images[0].onMount = spec.support === 'paper'
    if (i < 6) {
      const d = await processImage(await detail(main), { role: 'detail', alt: `${spec.title}, detail of the surface` })
      d.caption = 'Detail, centre right'
      const rm = await processImage(await room(main, spec), { role: 'room', alt: `${spec.title} on a living-room wall` })
      rm.isDigitalPreview = true
      images.push(d, rm)
    }
    const year = spec.year
    const seq = (await CounterModel.findOneAndUpdate({ _id: `artwork-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' }).lean()) as { seq: number }
    const preset = spec.prints === 'paper' ? DEFAULT_SETTINGS.printPresets[0] : spec.prints === 'canvas' ? DEFAULT_SETTINGS.printPresets[1] : undefined
    await ArtworkModel.create({
      ref: `SM-${year}-${String(seq.seq).padStart(3, '0')}`,
      title: spec.title,
      slug: slugify(spec.title),
      isPublished: true,
      availability: spec.availability,
      year,
      medium: spec.medium,
      mediumTags: spec.tags,
      support: spec.support,
      heightCm: spec.h,
      widthCm: spec.w,
      depthCm: spec.support === 'canvas' ? 4 : undefined,
      series: spec.series,
      tags: ['sample'],
      story:
        spec.availability === 'upcoming'
          ? undefined
          : 'Sample story. I started this one during the first rain of June. The colour is four layers of wash, scraped back while still wet, so the canvas shows through. It is about waiting for weather.',
      images,
      original: {
        forSale: spec.availability !== 'upcoming',
        price: spec.price ? { mode: 'fixed', amountInr: spec.price } : { mode: 'on_request' },
        presentation: spec.support === 'paper' ? 'unframed-paper' : 'stretched',
        readyToHang: spec.support === 'canvas',
      },
      prints: preset
        ? { enabled: true, edition: 'limited', signed: true, variants: preset.variants.map((v, k) => ({ ...v, id: `v${k + 1}`, editionSize: 25, editionsSold: k * 3 })) }
        : { enabled: false, edition: 'open', signed: true, variants: [] },
      upcoming: spec.expected ? { expectedMonth: spec.expected, studioNote: 'Sample note. The first layers are down. I am waiting for the ground to dry before the dark band goes in.' } : {},
      featured: !!spec.featured,
      isHero: !!spec.hero,
      sortOrder: order++,
      publishedAt: new Date(),
      soldAt: spec.availability === 'sold' ? new Date() : undefined,
    })
    console.log(`Added ${spec.title} (${images.length} images)`)
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err)
    await mongoose.disconnect()
    process.exit(1)
  })
