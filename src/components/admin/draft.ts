// The editor's form state, and conversion to and from the API shape.
import type { ArtImage, Artwork, Availability, MediumTag, PrintVariant, Support } from '@/lib/types'

export type VariantDraft = Omit<PrintVariant, 'heightCm' | 'widthCm' | 'priceInr' | 'editionSize'> & {
  heightCm: string
  widthCm: string
  priceInr: string
  editionSize: string
}

export interface Draft {
  title: string
  slug: string
  isPublished: boolean
  availability: Availability
  year: string
  medium: string
  support: Support
  heightCm: string
  widthCm: string
  depthCm: string
  series: string
  subjects: string
  tags: string
  story: string
  images: ArtImage[]
  forSale: boolean
  priceMode: 'fixed' | 'on_request'
  priceInr: string
  presentation: Artwork['original']['presentation']
  frameNote: string
  readyToHang: boolean
  printsEnabled: boolean
  edition: 'open' | 'limited'
  signed: boolean
  variants: VariantDraft[]
  certificateIncluded: boolean
  certificateNote: string
  leadTimeDays: string
  packaging: string
  international: 'default' | 'yes' | 'no'
  expectedMonth: string
  studioNote: string
  featured: boolean
  isHero: boolean
  seoDescription: string
}

export function emptyDraft(year: number): Draft {
  return {
    title: '', slug: '', isPublished: false, availability: 'available', year: String(year), medium: '', support: 'canvas',
    heightCm: '', widthCm: '', depthCm: '', series: '', subjects: '', tags: '', story: '', images: [],
    forSale: true, priceMode: 'fixed', priceInr: '', presentation: 'stretched', frameNote: '', readyToHang: true,
    printsEnabled: false, edition: 'limited', signed: true, variants: [],
    certificateIncluded: true, certificateNote: '', leadTimeDays: '', packaging: '', international: 'default',
    expectedMonth: '', studioNote: '', featured: false, isHero: false, seoDescription: '',
  }
}

const str = (n?: number) => (n === undefined || n === null ? '' : String(n))

export function variantToDraft(v: Omit<PrintVariant, 'id' | 'editionsSold'> & Partial<Pick<PrintVariant, 'id' | 'editionsSold'>>): VariantDraft {
  return {
    ...v,
    id: v.id ?? newVariantId(),
    editionsSold: v.editionsSold ?? 0,
    heightCm: str(v.heightCm),
    widthCm: str(v.widthCm),
    priceInr: str(v.priceInr),
    editionSize: str(v.editionSize),
  }
}

export function toDraft(a: Artwork): Draft {
  return {
    title: a.title, slug: a.slug, isPublished: a.isPublished, availability: a.availability, year: String(a.year),
    medium: a.medium, support: a.support, heightCm: str(a.heightCm), widthCm: str(a.widthCm), depthCm: str(a.depthCm),
    series: a.series ?? '', subjects: a.subjects.join(', '), tags: a.tags.join(', '), story: a.story ?? '', images: a.images,
    forSale: a.original.forSale, priceMode: a.original.price.mode,
    priceInr: a.original.price.mode === 'fixed' ? String(a.original.price.amountInr) : '',
    presentation: a.original.presentation, frameNote: a.original.frameNote ?? '', readyToHang: a.original.readyToHang,
    printsEnabled: a.prints.enabled, edition: a.prints.edition, signed: a.prints.signed,
    variants: a.prints.variants.map(variantToDraft),
    certificateIncluded: a.certificate.included, certificateNote: a.certificate.note ?? '',
    leadTimeDays: str(a.shipping.leadTimeDays), packaging: a.shipping.packaging ?? '',
    international: a.shipping.international === undefined ? 'default' : a.shipping.international ? 'yes' : 'no',
    expectedMonth: a.upcoming.expectedMonth ?? '', studioNote: a.upcoming.studioNote ?? '',
    featured: a.featured, isHero: a.isHero, seoDescription: a.seoDescription ?? '',
  }
}

/** Filter tags come from the medium text, so the artist never fills them in separately. */
export function mediumTagsFor(medium: string): MediumTag[] {
  const m = medium.toLowerCase()
  const tags: MediumTag[] = []
  if (/acrylic/.test(m)) tags.push('acrylic')
  if (/watercolou?r/.test(m)) tags.push('watercolour')
  if (/mixed/.test(m)) tags.push('mixed-media')
  if (/\bink\b/.test(m)) tags.push('ink')
  return tags
}

export function supportFor(medium: string): Support | undefined {
  const m = medium.toLowerCase()
  if (/\bon (cotton )?paper\b/.test(m)) return 'paper'
  if (/\bon (board|panel|wood)\b/.test(m)) return 'board'
  if (/\bon (cotton |linen )?canvas\b/.test(m)) return 'canvas'
  return undefined
}

export function newVariantId(): string {
  return `v${Math.random().toString(36).slice(2, 9)}`
}

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(/,/g, '')))
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

const ROLE_WORD: Record<string, string> = { main: '', view: 'another view', detail: 'detail of the surface', room: 'on a wall', wip: 'in progress' }

/** The JSON the API expects. Empty alt text gets a sensible default. */
export function toInput(d: Draft, publish: boolean) {
  const title = d.title.trim()
  return {
    title,
    slug: d.slug.trim() || undefined,
    isPublished: publish,
    availability: d.availability,
    year: Number(d.year),
    medium: d.medium.trim(),
    mediumTags: mediumTagsFor(d.medium),
    support: d.support,
    heightCm: num(d.heightCm),
    widthCm: num(d.widthCm),
    depthCm: num(d.depthCm),
    series: d.series.trim() || undefined,
    subjects: list(d.subjects),
    tags: list(d.tags),
    story: d.story.trim() || undefined,
    images: d.images.map((i) => ({
      ...i,
      alt: i.alt.trim() || [title, ROLE_WORD[i.role] || d.medium.trim()].filter(Boolean).join(', '),
    })),
    original: {
      forSale: d.forSale,
      price: d.priceMode === 'fixed' && num(d.priceInr) ? { mode: 'fixed', amountInr: num(d.priceInr) } : { mode: 'on_request' },
      presentation: d.presentation,
      frameNote: d.frameNote.trim() || undefined,
      readyToHang: d.readyToHang,
    },
    prints: {
      enabled: d.printsEnabled,
      edition: d.edition,
      signed: d.signed,
      variants: d.printsEnabled
        ? d.variants.map((v) => ({
            ...v,
            heightCm: num(v.heightCm),
            widthCm: num(v.widthCm),
            priceInr: num(v.priceInr),
            editionSize: d.edition === 'limited' ? num(v.editionSize) : undefined,
          }))
        : [],
    },
    certificate: { included: d.certificateIncluded, note: d.certificateNote.trim() || undefined },
    shipping: {
      leadTimeDays: num(d.leadTimeDays),
      packaging: d.packaging.trim() || undefined,
      international: d.international === 'default' ? undefined : d.international === 'yes',
    },
    upcoming: { expectedMonth: d.expectedMonth || undefined, studioNote: d.studioNote.trim() || undefined },
    featured: d.featured,
    isHero: d.isHero,
    seoDescription: d.seoDescription.trim() || undefined,
  }
}
