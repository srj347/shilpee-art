'use client'

import { useEffect, useRef, useState } from 'react'
import { useEnquiry } from '@/components/enquiry/EnquiryProvider'
import { originalButtonLabel, originalRequest } from './BuyPanel'
import type { Artwork } from '@/lib/types'

/**
 * Phones: a slim bar that slides up once the main button has scrolled out of view.
 * Lookups stay inside this page's root, because Next.js keeps earlier pages
 * in the document as hidden copies.
 */
export function StickyEnquire({ work }: { work: Artwork }) {
  const { open } = useEnquiry()
  const [visible, setVisible] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  const primary = () =>
    bar.current?.closest('[data-work-root]')?.querySelector<HTMLButtonElement>('[data-primary-enquire]') ?? null

  useEffect(() => {
    const root = bar.current?.closest('[data-work-root]')
    if (!root) return
    let io: IntersectionObserver | undefined
    let target: Element | null = null
    const attach = () => {
      const next = root.querySelector('[data-primary-enquire]')
      if (!next || next === target) return
      target = next
      io?.disconnect()
      io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.top < 0))
      io.observe(next)
    }
    attach()
    // The button is replaced when the Original/Prints tab changes.
    const mo = new MutationObserver(attach)
    mo.observe(root, { childList: true, subtree: true })
    return () => {
      io?.disconnect()
      mo.disconnect()
    }
  }, [])

  const label = originalButtonLabel(work)
  return (
    <div ref={bar} className={`sticky-enquire${visible ? ' is-visible' : ''}`} aria-hidden={!visible} inert={!visible}>
      <span className="t">{work.title}</span>
      <button
        type="button"
        className="btn"
        onClick={() => {
          // Use the visible panel's button, so a chosen print is kept.
          const p = primary()
          if (p && !p.disabled) p.click()
          else open(originalRequest(work))
        }}
      >
        {label === 'Enquire about this work' ? 'Enquire' : label}
      </button>
    </div>
  )
}
