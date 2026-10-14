'use client'

import { useEffect } from 'react'

/**
 * Adds .is-in to every .reveal element as it scrolls into view, once.
 * Watches the page for new elements (streamed content, client navigation).
 * Content stays visible without JavaScript; see .js .reveal in globals.css.
 */
export function RevealObserver() {
  useEffect(() => {
    const show = (el: Element) => el.classList.add('is-in')
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(show)
      return
    }
    const seen = new WeakSet<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target)
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    )
    const scan = () => {
      document.querySelectorAll('.reveal:not(.is-in)').forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el)
          io.observe(el)
        }
      })
    }
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io.disconnect()
    }
  }, [])
  return null
}
