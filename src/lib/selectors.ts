// Pure helpers that pick works for each page. No database access here.
import { sizeTier, type SizeTier } from './format'
import type { ArtImage, Artwork, MediumTag } from './types'

export function mainImage(a: Pick<Artwork, 'images'>): ArtImage | undefined {
  return a.images.find((i) => i.role === 'main') ?? a.images[0]
}

/** Works shown on /works: available and reserved, plus sold when asked. Never upcoming. */
export function worksForIndex(all: Artwork[], includeSold: boolean): Artwork[] {
  return all.filter(
    (a) =>
      a.availability === 'available' ||
      a.availability === 'reserved' ||
      (includeSold && a.availability === 'sold'),
  )
}

export interface WorkFilter {
  medium?: MediumTag
  size?: SizeTier
  includeSold?: boolean
}

export function filterWorks(all: Artwork[], f: WorkFilter): Artwork[] {
  return worksForIndex(all, !!f.includeSold).filter(
    (a) =>
      (!f.medium || a.mediumTags.includes(f.medium)) &&
      (!f.size || sizeTier(a.heightCm, a.widthCm) === f.size),
  )
}

export function heroWork(all: Artwork[]): Artwork | undefined {
  const shown = all.filter((a) => a.availability !== 'upcoming' && mainImage(a))
  return shown.find((a) => a.isHero) ?? shown.find((a) => a.featured) ?? shown[0]
}

export function featuredWorks(all: Artwork[], exclude?: string, limit = 6): Artwork[] {
  const pool = all.filter((a) => a.availability !== 'upcoming' && a.id !== exclude && mainImage(a))
  const featured = pool.filter((a) => a.featured)
  return (featured.length ? featured : pool).slice(0, limit)
}

export function upcomingWorks(all: Artwork[]): Artwork[] {
  return all.filter((a) => a.availability === 'upcoming')
}

export function printWorks(all: Artwork[]): Artwork[] {
  return all.filter(
    (a) => a.availability !== 'upcoming' && a.prints.enabled && a.prints.variants.some((v) => v.active),
  )
}

/** Same series first, then same medium, never the work itself. */
export function relatedWorks(all: Artwork[], work: Artwork, limit = 3): Artwork[] {
  const pool = all.filter((a) => a.id !== work.id && a.availability !== 'upcoming' && mainImage(a))
  const score = (a: Artwork) =>
    (work.series && a.series === work.series ? 2 : 0) +
    (a.mediumTags.some((t) => work.mediumTags.includes(t)) ? 1 : 0) +
    (a.availability === 'available' ? 0.5 : 0)
  return [...pool].sort((x, y) => score(y) - score(x)).slice(0, limit)
}

/** Split works into rows of up to `perRow` for the eye-level hang. */
export function hangRows<T>(items: T[], perRow = 3): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow))
  return rows
}
