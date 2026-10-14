// Browser-side helpers for enquiries: pre-filled messages and WhatsApp links.
import type { ArtImage, EnquiryType } from './types'

export interface EnquiryRequest {
  type: EnquiryType
  artwork?: {
    id: string
    title: string
    year: number
    meta: string // "Original · ₹1,80,000"
    size: string // "90 × 120 cm"
    image?: ArtImage
    slug: string
  }
  print?: { variantId: string; label: string; priceInr: number }
  /** Reserved works ask to be next in line; sold works ask for something similar. */
  intent?: 'next-in-line' | 'similar'
}

export function defaultMessage(req: EnquiryRequest, artistFirstName = 'Shilpee'): string {
  const t = req.artwork?.title
  switch (req.type) {
    case 'original':
      return req.intent === 'next-in-line'
        ? `Hello ${artistFirstName}, if ${t} becomes available, please let me know.`
        : `Hello ${artistFirstName}, I'm interested in ${t}. Could you tell me more?`
    case 'print':
      return `Hello ${artistFirstName}, I'd like the ${req.print?.label ?? ''} print of ${t}.`
    case 'upcoming':
      return `Please let me know when ${t} is finished.`
    case 'commission':
      return t
        ? `Hello ${artistFirstName}, I love ${t}. Do you have something similar, or could you make one?`
        : `Hello ${artistFirstName}, I'd like to talk about a commission. The wall is about ___ wide.`
    default:
      return ''
  }
}

export function sheetTitle(req: EnquiryRequest): string {
  switch (req.type) {
    case 'upcoming':
      return 'Register interest'
    case 'commission':
      return 'Commission a work'
    case 'general':
      return 'Send a message'
    default:
      return 'Enquire'
  }
}

export function whatsappLink(number: string, text: string): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function whatsappText(req: EnquiryRequest, pageUrl: string, artistFirstName = 'Shilpee'): string {
  if (!req.artwork) return `Hello ${artistFirstName}, `
  const what = req.print ? `the ${req.print.label} print of ${req.artwork.title}` : `${req.artwork.title} (original, ${req.artwork.size})`
  return `Hello ${artistFirstName}, I'm interested in ${what}. ${pageUrl}`
}

/** Fires an analytics event when Umami is present. */
export function track(event: string, data?: Record<string, string | number>) {
  const w = window as unknown as { umami?: { track: (e: string, d?: object) => void } }
  try {
    w.umami?.track(event, data)
  } catch {
    // analytics must never break the page
  }
}
