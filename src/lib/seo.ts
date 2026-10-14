import { env } from './env'
import { fallbackSrc, ogUrl } from './media'
import { mainImage } from './selectors'
import type { Artwork, Settings } from './types'

export function absolute(url: string): string {
  return url.startsWith('http') ? url : `${env.siteUrl}${url}`
}

export function workDescription(w: Artwork): string {
  if (w.seoDescription) return w.seoDescription
  const base = `${w.title}, ${w.year}. ${w.medium}, ${w.heightCm} × ${w.widthCm} cm, by Shilpee Maitra.`
  const story = w.story ? ` ${w.story}` : ''
  const text = base + story
  return text.length > 158 ? `${text.slice(0, 155).replace(/\s+\S*$/, '')}…` : text
}

export function workOgImage(w: Artwork): string | undefined {
  const img = mainImage(w)
  return img ? absolute(ogUrl(img.id)) : undefined
}

/** schema.org VisualArtwork, with an Offer only when there is a fixed price and the work is for sale. */
export function artworkJsonLd(w: Artwork, s: Settings) {
  const img = mainImage(w)
  const surface = { canvas: 'Canvas', paper: 'Paper', board: 'Board' }[w.support]
  const availability =
    w.availability === 'available'
      ? 'https://schema.org/InStock'
      : w.availability === 'upcoming'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/SoldOut'
  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: w.title,
    url: absolute(`/works/${w.slug}`),
    artist: { '@type': 'Person', name: s.artistName },
    artform: 'Painting',
    artMedium: w.medium,
    artworkSurface: surface,
    height: { '@type': 'QuantitativeValue', value: w.heightCm, unitCode: 'CMT' },
    width: { '@type': 'QuantitativeValue', value: w.widthCm, unitCode: 'CMT' },
    ...(w.depthCm ? { depth: { '@type': 'QuantitativeValue', value: w.depthCm, unitCode: 'CMT' } } : {}),
    dateCreated: String(w.year),
    identifier: w.ref,
    ...(img ? { image: absolute(fallbackSrc(img)) } : {}),
    ...(w.story ? { description: w.story } : {}),
    ...(w.original.price.mode === 'fixed' && w.original.forSale && w.availability !== 'upcoming'
      ? {
          offers: {
            '@type': 'Offer',
            price: w.original.price.amountInr,
            priceCurrency: 'INR',
            availability,
            url: absolute(`/works/${w.slug}`),
          },
        }
      : {}),
  }
}

/** Escape "<" so JSON inside a script tag can never close it. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
