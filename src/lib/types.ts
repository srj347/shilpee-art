// Plain data shapes shared by server and client code.
// Database documents are converted to these in serialize.ts.

export type Availability = 'available' | 'reserved' | 'sold' | 'upcoming'
export type ImageRole = 'main' | 'view' | 'detail' | 'room' | 'wip'
export type MediumTag = 'acrylic' | 'watercolour' | 'mixed-media' | 'ink'
export type Support = 'canvas' | 'paper' | 'board'
export type Presentation = 'stretched' | 'framed' | 'rolled' | 'unframed-paper'

export type Price = { mode: 'fixed'; amountInr: number } | { mode: 'on_request' }

export interface ArtImage {
  id: string
  role: ImageRole
  alt: string
  caption?: string
  width: number
  height: number
  dominant: string
  lqip: string
  onMount: boolean
  isDigitalPreview: boolean
}

export interface PrintVariant {
  id: string
  label: string
  heightCm: number
  widthCm: number
  material: 'paper' | 'canvas'
  substrate: string
  finish: 'matte' | 'satin'
  framed: boolean
  frameNote?: string
  priceInr: number
  editionSize?: number
  editionsSold: number
  active: boolean
}

export interface Artwork {
  id: string
  ref: string
  title: string
  slug: string
  isPublished: boolean
  availability: Availability
  year: number
  medium: string
  mediumTags: MediumTag[]
  support: Support
  heightCm: number
  widthCm: number
  depthCm?: number
  series?: string
  subjects: string[]
  tags: string[]
  story?: string
  images: ArtImage[]
  original: {
    forSale: boolean
    price: Price
    presentation: Presentation
    frameNote?: string
    readyToHang: boolean
  }
  prints: {
    enabled: boolean
    edition: 'open' | 'limited'
    signed: boolean
    variants: PrintVariant[]
  }
  certificate: { included: boolean; note?: string }
  shipping: { leadTimeDays?: number; packaging?: string; international?: boolean }
  upcoming: { expectedMonth?: string; studioNote?: string }
  featured: boolean
  isHero: boolean
  sortOrder: number
  seoDescription?: string
  publishedAt?: string
  soldAt?: string
  createdAt: string
  updatedAt: string
}

export interface PrintPreset {
  name: string
  variants: Omit<PrintVariant, 'id' | 'editionsSold'>[]
}

export interface Settings {
  artistName: string
  statement: string
  about: string
  cv: { year: string; text: string }[]
  portrait?: ArtImage
  studioImages: ArtImage[]
  contact: { email: string; whatsapp: string; instagram: string; replyPromise: string }
  notifyEmails: string[]
  defaults: {
    certificateNote: string
    shipsFrom: string
    packaging: string
    leadTimeDays: number
    printLeadTimeDays: number
    printNote: string
  }
  printPresets: PrintPreset[]
}

export type EnquiryType = 'original' | 'print' | 'commission' | 'upcoming' | 'general'
export type EnquiryStatus = 'new' | 'replied' | 'closed' | 'spam'
export type MailState = 'pending' | 'sent' | 'failed'

export interface Enquiry {
  id: string
  ref: string
  type: EnquiryType
  artwork?: {
    id: string
    ref: string
    title: string
    slug: string
    availability: Availability
    priceShown?: string
    thumbId?: string
  }
  print?: { variantId: string; label: string; priceInr: number }
  name: string
  email: string
  phone?: string
  message: string
  pageUrl: string
  referrer?: string
  utmSource?: string
  status: EnquiryStatus
  artistNote?: string
  mail: { toArtist: MailState; toVisitor: MailState; attempts: number; lastError?: string }
  createdAt: string
  updatedAt: string
}
