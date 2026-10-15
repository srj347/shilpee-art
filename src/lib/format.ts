import type { Artwork, Availability, Price } from './types'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** ₹1,80,000 */
export function formatInr(amount: number): string {
  return inr.format(amount)
}

export function priceLabel(price: Price): string {
  return price.mode === 'fixed' ? formatInr(price.amountInr) : 'Price on request'
}

export function cmToIn(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10
}

/** Gallery convention: height × width (× depth). */
export function sizeCm(h: number, w: number, d?: number): string {
  return d ? `${h} × ${w} × ${d} cm` : `${h} × ${w} cm`
}

export function sizeIn(h: number, w: number): string {
  return `${cmToIn(h)} × ${cmToIn(w)} in`
}

export type SizeTier = 'small' | 'medium' | 'large'

/** Longest side: up to 50 cm small, 51–100 medium, over 100 large. */
export function sizeTier(h: number, w: number): SizeTier {
  const longest = Math.max(h, w)
  if (longest <= 50) return 'small'
  if (longest <= 100) return 'medium'
  return 'large'
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "2026-12" → "December 2026" */
export function monthLabel(ym?: string): string | undefined {
  if (!ym) return undefined
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!m) return undefined
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${month} ${m[1]}` : undefined
}

export function availabilityLabel(a: Availability, expectedMonth?: string): string {
  switch (a) {
    case 'available':
      return 'Available'
    case 'reserved':
      return 'Reserved'
    case 'sold':
      return 'Sold'
    case 'upcoming': {
      const when = monthLabel(expectedMonth)
      return when ? `In the studio · expected ${when}` : 'In the studio'
    }
  }
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Lowest active print price, if the work has prints. */
export function printsFrom(a: Pick<Artwork, 'prints'>): number | undefined {
  if (!a.prints.enabled) return undefined
  const prices = a.prints.variants.filter((v) => v.active).map((v) => v.priceInr)
  return prices.length ? Math.min(...prices) : undefined
}

export function editionLine(edition: 'open' | 'limited', size?: number, sold = 0): string {
  if (edition === 'open' || !size) return 'Open edition'
  const left = Math.max(0, size - sold)
  return left === 0 ? `Limited edition of ${size} · sold out` : `Limited edition of ${size} · ${left} left`
}

export function mediumTagLabel(tag: string): string {
  return (
    { acrylic: 'Acrylic', watercolour: 'Watercolour', 'mixed-media': 'Mixed media', ink: 'Ink' }[tag] ?? tag
  )
}

/** "919848012345" → "+91 98480 12345". Other numbers keep their digits after a plus sign. */
export function formatPhone(digitsOrText: string): string {
  const d = digitsOrText.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`
  return d ? `+${d}` : ''
}
