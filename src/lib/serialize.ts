// Converts lean MongoDB documents into the plain shapes in types.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DEFAULT_SETTINGS } from './defaults'
import type { ArtImage, Artwork, Enquiry, PrintVariant, Settings } from './types'

const iso = (d: unknown): string | undefined => (d ? new Date(d as string).toISOString() : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined)

export function toImage(i: any): ArtImage {
  return {
    id: i.id,
    role: i.role ?? 'view',
    alt: i.alt ?? '',
    caption: str(i.caption),
    width: i.width,
    height: i.height,
    dominant: i.dominant ?? '#EFEFEC',
    lqip: i.lqip ?? '',
    onMount: !!i.onMount,
    isDigitalPreview: !!i.isDigitalPreview,
  }
}

function toVariant(v: any): PrintVariant {
  return {
    id: v.id,
    label: v.label,
    heightCm: v.heightCm,
    widthCm: v.widthCm,
    material: v.material,
    substrate: v.substrate ?? '',
    finish: v.finish ?? 'matte',
    framed: !!v.framed,
    frameNote: str(v.frameNote),
    priceInr: v.priceInr,
    editionSize: v.editionSize ?? undefined,
    editionsSold: v.editionsSold ?? 0,
    active: v.active !== false,
  }
}

export function toArtwork(d: any): Artwork {
  const price =
    d.original?.price?.mode === 'fixed' && typeof d.original.price.amountInr === 'number'
      ? { mode: 'fixed' as const, amountInr: d.original.price.amountInr }
      : { mode: 'on_request' as const }
  return {
    id: String(d._id),
    ref: d.ref,
    title: d.title,
    slug: d.slug,
    isPublished: !!d.isPublished,
    availability: d.availability,
    year: d.year,
    medium: d.medium ?? '',
    mediumTags: d.mediumTags ?? [],
    support: d.support ?? 'canvas',
    heightCm: d.heightCm,
    widthCm: d.widthCm,
    depthCm: d.depthCm ?? undefined,
    series: str(d.series),
    subjects: d.subjects ?? [],
    tags: d.tags ?? [],
    story: str(d.story),
    images: (d.images ?? []).map(toImage),
    original: {
      forSale: d.original?.forSale !== false,
      price,
      presentation: d.original?.presentation ?? 'stretched',
      frameNote: str(d.original?.frameNote),
      readyToHang: d.original?.readyToHang !== false,
    },
    prints: {
      enabled: !!d.prints?.enabled,
      edition: d.prints?.edition ?? 'open',
      signed: d.prints?.signed !== false,
      variants: (d.prints?.variants ?? []).map(toVariant),
    },
    certificate: { included: d.certificate?.included !== false, note: str(d.certificate?.note) },
    shipping: {
      leadTimeDays: d.shipping?.leadTimeDays ?? undefined,
      packaging: str(d.shipping?.packaging),
      international: d.shipping?.international ?? undefined,
    },
    upcoming: { expectedMonth: str(d.upcoming?.expectedMonth), studioNote: str(d.upcoming?.studioNote) },
    featured: !!d.featured,
    isHero: !!d.isHero,
    sortOrder: d.sortOrder ?? 0,
    seoDescription: str(d.seoDescription),
    publishedAt: iso(d.publishedAt),
    soldAt: iso(d.soldAt),
    createdAt: iso(d.createdAt) ?? new Date(0).toISOString(),
    updatedAt: iso(d.updatedAt) ?? new Date(0).toISOString(),
  }
}

export function toSettings(doc: any): Settings {
  const s = (doc?.data ?? {}) as Partial<Settings>
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    contact: { ...DEFAULT_SETTINGS.contact, ...(s.contact ?? {}) },
    defaults: { ...DEFAULT_SETTINGS.defaults, ...(s.defaults ?? {}) },
    cv: s.cv ?? [],
    studioImages: (s.studioImages ?? []).map(toImage),
    portrait: s.portrait ? toImage(s.portrait) : undefined,
    printPresets: s.printPresets?.length ? s.printPresets : DEFAULT_SETTINGS.printPresets,
    notifyEmails: s.notifyEmails ?? [],
  }
}

export function toEnquiry(d: any): Enquiry {
  return {
    id: String(d._id),
    ref: d.ref,
    type: d.type,
    artwork: d.artwork?.id
      ? {
          id: d.artwork.id,
          ref: d.artwork.ref,
          title: d.artwork.title,
          slug: d.artwork.slug,
          availability: d.artwork.availability,
          priceShown: str(d.artwork.priceShown),
          thumbId: str(d.artwork.thumbId),
        }
      : undefined,
    print: d.print?.variantId ? { variantId: d.print.variantId, label: d.print.label, priceInr: d.print.priceInr } : undefined,
    name: d.name,
    email: d.email,
    phone: str(d.phone),
    message: d.message ?? '',
    pageUrl: d.pageUrl ?? '',
    referrer: str(d.referrer),
    utmSource: str(d.utmSource),
    status: d.status,
    artistNote: str(d.artistNote),
    mail: {
      toArtist: d.mail?.toArtist ?? 'pending',
      toVisitor: d.mail?.toVisitor ?? 'pending',
      attempts: d.mail?.attempts ?? 0,
      lastError: str(d.mail?.lastError),
    },
    createdAt: iso(d.createdAt)!,
    updatedAt: iso(d.updatedAt)!,
  }
}
