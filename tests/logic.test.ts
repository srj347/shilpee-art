import { describe, expect, it } from 'vitest'
import { cmToIn, editionLine, formatInr, monthLabel, printsFrom, sizeTier, slugify } from '@/lib/format'
import { variantSizes } from '@/lib/media'
import { featuredWorks, filterWorks, heroWork, relatedWorks } from '@/lib/selectors'
import { checkFormToken, countLinks, issueFormToken, resetRates, takeRate } from '@/lib/spam'
import type { Artwork } from '@/lib/types'

function work(p: Partial<Artwork> & { id: string }): Artwork {
  return {
    ref: `SM-2026-${p.id}`,
    title: `Work ${p.id}`,
    slug: `work-${p.id}`,
    isPublished: true,
    availability: 'available',
    year: 2026,
    medium: 'Acrylic on canvas',
    mediumTags: ['acrylic'],
    support: 'canvas',
    heightCm: 60,
    widthCm: 80,
    subjects: [],
    tags: [],
    images: [{ id: `img${p.id}`, role: 'main', alt: '', width: 800, height: 600, dominant: '#000', lqip: '', onMount: false, isDigitalPreview: false }],
    original: { forSale: true, price: { mode: 'on_request' }, presentation: 'stretched', readyToHang: true },
    prints: { enabled: false, edition: 'open', signed: true, variants: [] },
    certificate: { included: true },
    shipping: {},
    upcoming: {},
    featured: false,
    isHero: false,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...p,
  }
}

describe('format', () => {
  it('formats rupees in the Indian system', () => {
    expect(formatInr(180000)).toBe('₹1,80,000')
    expect(formatInr(4500)).toBe('₹4,500')
  })
  it('converts centimetres to inches with one decimal', () => {
    expect(cmToIn(90)).toBe(35.4)
    expect(cmToIn(120)).toBe(47.2)
  })
  it('puts works in size tiers by the longest side', () => {
    expect(sizeTier(40, 30)).toBe('small')
    expect(sizeTier(50, 50)).toBe('small')
    expect(sizeTier(76, 102)).toBe('large')
    expect(sizeTier(90, 60)).toBe('medium')
  })
  it('reads expected months', () => {
    expect(monthLabel('2026-12')).toBe('December 2026')
    expect(monthLabel('2026-13')).toBeUndefined()
    expect(monthLabel(undefined)).toBeUndefined()
  })
  it('makes clean slugs', () => {
    expect(slugify('Banyan, Morning')).toBe('banyan-morning')
    expect(slugify('Ochre Field (working title)')).toBe('ochre-field-working-title')
    expect(slugify('Café & Rain')).toBe('cafe-and-rain')
  })
  it('describes editions', () => {
    expect(editionLine('open')).toBe('Open edition')
    expect(editionLine('limited', 25, 7)).toBe('Limited edition of 25 · 18 left')
    expect(editionLine('limited', 10, 10)).toBe('Limited edition of 10 · sold out')
  })
  it('finds the lowest active print price', () => {
    const w = work({
      id: '1',
      prints: {
        enabled: true,
        edition: 'open',
        signed: true,
        variants: [
          { id: 'a', label: 'a', heightCm: 1, widthCm: 1, material: 'paper', substrate: '', finish: 'matte', framed: false, priceInr: 3000, editionsSold: 0, active: false },
          { id: 'b', label: 'b', heightCm: 1, widthCm: 1, material: 'paper', substrate: '', finish: 'matte', framed: false, priceInr: 5000, editionsSold: 0, active: true },
        ],
      },
    })
    expect(printsFrom(w)).toBe(5000)
    expect(printsFrom(work({ id: '2' }))).toBeUndefined()
  })
})

describe('image sizes', () => {
  it('never makes a size larger than the photo, but always makes one', () => {
    expect(variantSizes(1800, 1350).map((v) => v.size)).toEqual([480, 960, 1440, 2048])
    expect(variantSizes(1800, 1350).at(-1)).toMatchObject({ width: 1800, height: 1350 })
    expect(variantSizes(300, 200)).toEqual([{ size: 480, width: 300, height: 200 }])
  })
  it('scales by the long edge for portrait photos', () => {
    expect(variantSizes(3000, 4000)[0]).toEqual({ size: 480, width: 360, height: 480 })
  })
})

describe('selectors', () => {
  const all = [
    work({ id: '1', isHero: true, featured: true }),
    work({ id: '2', featured: true, availability: 'sold', mediumTags: ['watercolour'] }),
    work({ id: '3', availability: 'upcoming' }),
    work({ id: '4', availability: 'reserved', heightCm: 150, widthCm: 120 }),
    work({ id: '5', series: 'Monsoon' }),
  ]
  it('shows available and reserved works, sold only when asked, never upcoming', () => {
    expect(filterWorks(all, {}).map((w) => w.id)).toEqual(['1', '4', '5'])
    expect(filterWorks(all, { includeSold: true }).map((w) => w.id)).toEqual(['1', '2', '4', '5'])
    expect(filterWorks(all, { size: 'large', includeSold: true }).map((w) => w.id)).toEqual(['4'])
    expect(filterWorks(all, { medium: 'watercolour' })).toEqual([])
  })
  it('picks the hero and keeps it out of the featured list', () => {
    const hero = heroWork(all)!
    expect(hero.id).toBe('1')
    expect(featuredWorks(all, hero.id).map((w) => w.id)).toEqual(['2'])
  })
  it('ranks related works by series first and excludes the work itself', () => {
    const base = work({ id: '9', series: 'Monsoon' })
    const related = relatedWorks([...all, base], base, 2)
    expect(related[0].id).toBe('5')
    expect(related.map((w) => w.id)).not.toContain('9')
    expect(related.map((w) => w.id)).not.toContain('3')
  })
})

describe('spam protection', () => {
  const secret = 'x'.repeat(40)
  it('accepts a token after 3 seconds and rejects fast, old or forged ones', () => {
    const t0 = 1_000_000_000_000
    const token = issueFormToken(secret, t0)
    expect(checkFormToken(token, secret, t0 + 1000)).toBe('too-fast')
    expect(checkFormToken(token, secret, t0 + 5000)).toBe('ok')
    expect(checkFormToken(token, secret, t0 + 25 * 3600 * 1000)).toBe('expired')
    expect(checkFormToken(token, 'y'.repeat(40), t0 + 5000)).toBe('invalid')
    expect(checkFormToken(`${t0 - 9000}.${token.split('.')[1]}`, secret, t0 + 5000)).toBe('invalid')
    expect(checkFormToken(undefined, secret)).toBe('invalid')
  })
  it('limits requests per key in a sliding window', () => {
    resetRates()
    const now = 5_000_000
    for (let i = 0; i < 5; i++) expect(takeRate('ip:1', 5, 3600_000, now + i)).toBe(true)
    expect(takeRate('ip:1', 5, 3600_000, now + 10)).toBe(false)
    expect(takeRate('ip:2', 5, 3600_000, now + 10)).toBe(true)
    expect(takeRate('ip:1', 5, 3600_000, now + 3600_001)).toBe(true)
  })
  it('counts links', () => {
    expect(countLinks('see https://a.com and www.b.com and http://c')).toBe(3)
    expect(countLinks('no links here')).toBe(0)
  })
})
