import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max)
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))
const cm = z.number().positive().max(2000)

export const imageSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{10,40}$/),
  role: z.enum(['main', 'view', 'detail', 'room', 'wip']),
  alt: text(300).default(''),
  caption: optText(160),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dominant: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  lqip: z.string().max(4000).default(''),
  onMount: z.boolean().default(false),
  isDigitalPreview: z.boolean().default(false),
})

export const variantSchema = z.object({
  id: z.string().min(1).max(40),
  label: text(120).min(1, 'Give each print size a label.'),
  heightCm: cm,
  widthCm: cm,
  material: z.enum(['paper', 'canvas']),
  substrate: text(120).default(''),
  finish: z.enum(['matte', 'satin']).default('matte'),
  framed: z.boolean().default(false),
  frameNote: optText(160),
  priceInr: z.number().int().min(0).max(10_000_000),
  editionSize: z.number().int().positive().max(10000).optional(),
  editionsSold: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export const artworkSchema = z
  .object({
    title: text(120).min(1, 'Add a title.'),
    slug: optText(80),
    isPublished: z.boolean().default(false),
    availability: z.enum(['available', 'reserved', 'sold', 'upcoming']),
    year: z.number().int().min(1950).max(2100),
    medium: text(160).default(''),
    mediumTags: z.array(z.enum(['acrylic', 'watercolour', 'mixed-media', 'ink'])).max(4).default([]),
    support: z.enum(['canvas', 'paper', 'board']).default('canvas'),
    heightCm: cm,
    widthCm: cm,
    depthCm: z.number().positive().max(100).optional(),
    series: optText(80),
    subjects: z.array(text(40)).max(20).default([]),
    tags: z.array(text(40)).max(20).default([]),
    story: optText(3000),
    images: z.array(imageSchema).max(20).default([]),
    original: z.object({
      forSale: z.boolean().default(true),
      price: z.discriminatedUnion('mode', [
        z.object({ mode: z.literal('fixed'), amountInr: z.number().int().positive().max(1_000_000_000) }),
        z.object({ mode: z.literal('on_request') }),
      ]),
      presentation: z.enum(['stretched', 'framed', 'rolled', 'unframed-paper']).default('stretched'),
      frameNote: optText(160),
      readyToHang: z.boolean().default(true),
    }),
    prints: z.object({
      enabled: z.boolean().default(false),
      edition: z.enum(['open', 'limited']).default('open'),
      signed: z.boolean().default(true),
      variants: z.array(variantSchema).max(20).default([]),
    }),
    certificate: z.object({ included: z.boolean().default(true), note: optText(300) }),
    shipping: z
      .object({
        leadTimeDays: z.number().int().min(0).max(365).optional(),
        packaging: optText(300),
        international: z.boolean().optional(),
      })
      .prefault({}),
    upcoming: z
      .object({ expectedMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)), studioNote: optText(1000) })
      .prefault({}),
    featured: z.boolean().default(false),
    isHero: z.boolean().default(false),
    seoDescription: optText(200),
  })
  .superRefine((a, ctx) => {
    if (a.isPublished && !a.images.length) {
      ctx.addIssue({ code: 'custom', path: ['images'], message: 'Add at least one photo before you put the work on the website.' })
    }
    if (a.prints.enabled && !a.prints.variants.some((v) => v.active)) {
      ctx.addIssue({ code: 'custom', path: ['prints'], message: 'Add at least one print size, or turn prints off.' })
    }
  })

export type ArtworkInput = z.infer<typeof artworkSchema>

/** Quick actions from the works list. */
export const quickSchema = z
  .object({
    availability: z.enum(['available', 'reserved', 'sold', 'upcoming']).optional(),
    isPublished: z.boolean().optional(),
    featured: z.boolean().optional(),
    isHero: z.boolean().optional(),
  })
  .strict()

export const settingsSchema = z.object({
  artistName: text(80).min(1),
  statement: text(300),
  about: text(6000),
  cv: z.array(z.object({ year: text(12), text: text(200) })).max(80),
  portrait: imageSchema.optional(),
  studioImages: z.array(imageSchema).max(6),
  contact: z.object({
    email: z.union([z.email(), z.literal('')]),
    whatsapp: z.string().trim().regex(/^\+?[\d\s]{0,18}$/, 'Use digits only, with the country code, e.g. 91 98480 12345.'),
    instagram: z.union([z.url(), z.literal('')]),
    replyPromise: text(80).min(1),
  }),
  notifyEmails: z.array(z.email()).min(1, 'Add at least one email that receives enquiries.').max(5),
  defaults: z.object({
    certificateNote: text(300),
    shipsFrom: text(80),
    packaging: text(300),
    leadTimeDays: z.number().int().min(0).max(365),
    printLeadTimeDays: z.number().int().min(0).max(365),
    printNote: text(400),
  }),
  printPresets: z
    .array(z.object({ name: text(60).min(1), variants: z.array(variantSchema.omit({ id: true, editionsSold: true })).max(20) }))
    .max(10),
})

export const enquirySchema = z.object({
  type: z.enum(['original', 'print', 'commission', 'upcoming', 'general']),
  artworkId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  variantId: z.string().max(40).optional(),
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
  email: z.email('Enter an email address, like name@example.com.').max(160),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, 'Enter a phone number with digits only, or leave it empty.')
    .optional(),
  message: z.string().trim().max(2000, 'Use 2,000 characters or fewer.').default(''),
  pageUrl: z.string().max(500).default(''),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(60).optional(),
  token: z.string().max(100).optional(),
  website: z.string().max(200).optional(),
})

/** Field errors keyed by the first path segment, first message only. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}
