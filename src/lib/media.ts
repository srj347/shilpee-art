// Image URL rules shared by the server pipeline and the browser.
// Every upload is stored as img/<id>/<size>.<ext> plus img/<id>/og.jpg.

import type { ArtImage } from './types'

export const SIZES = [480, 960, 1440, 2048, 2400] as const

export const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || '/media').replace(/\/$/, '')

export interface Variant {
  size: number
  width: number
  height: number
}

/**
 * The sizes made for an image of width × height. A size larger than the
 * image is skipped, but the image always gets at least one variant at its own size.
 */
export function variantSizes(width: number, height: number): Variant[] {
  const longEdge = Math.max(width, height)
  const out: Variant[] = []
  for (const size of SIZES) {
    const scale = Math.min(1, size / longEdge)
    out.push({ size, width: Math.round(width * scale), height: Math.round(height * scale) })
    if (scale === 1) break
  }
  return out
}

export function imageUrl(id: string, size: number, ext: 'avif' | 'webp'): string {
  return `${MEDIA_BASE}/img/${id}/${size}.${ext}`
}

export function ogUrl(id: string): string {
  return `${MEDIA_BASE}/img/${id}/og.jpg`
}

export function srcSet(img: Pick<ArtImage, 'id' | 'width' | 'height'>, ext: 'avif' | 'webp'): string {
  return variantSizes(img.width, img.height)
    .map((v) => `${imageUrl(img.id, v.size, ext)} ${v.width}w`)
    .join(', ')
}

/** A middle-sized WebP for the plain <img> fallback. */
export function fallbackSrc(img: Pick<ArtImage, 'id' | 'width' | 'height'>, target = 1440): string {
  const vs = variantSizes(img.width, img.height)
  const pick = vs.find((v) => v.size >= target) ?? vs[vs.length - 1]
  return imageUrl(img.id, pick.size, 'webp')
}

/** The largest WebP, for zoom. */
export function largestSrc(img: Pick<ArtImage, 'id' | 'width' | 'height'>): string {
  const vs = variantSizes(img.width, img.height)
  return imageUrl(img.id, vs[vs.length - 1].size, 'webp')
}
