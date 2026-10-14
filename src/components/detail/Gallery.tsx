'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, ViewTransition, type ReactNode, type RefObject } from 'react'
import { ArtImage } from '@/components/art/ArtImage'
import { Viewer } from '@/components/art/Viewer'
import { imageUrl, variantSizes } from '@/lib/media'
import type { ArtImage as Img } from '@/lib/types'

type Ctx = {
  stripImages: Img[]
  closerImages: Img[]
  open: (i: number) => void
  register: (i: number, el: HTMLElement | null) => void
  active: number
  setActive: (i: number) => void
  stripRef: RefObject<HTMLDivElement | null>
}
const GalleryContext = createContext<Ctx | null>(null)
const useGallery = () => useContext(GalleryContext)!

/**
 * Holds the work's images for the strip, the close-ups and the full-screen viewer.
 * The viewer shows the strip images first, then the close-ups.
 */
export function GalleryProvider({ images, children }: { images: Img[]; children: ReactNode }) {
  const order = { main: 0, view: 1, room: 2, wip: 3, detail: 4 } as const
  const sorted = [...images].sort((a, b) => order[a.role] - order[b.role])
  const stripImages = sorted.filter((i) => i.role !== 'detail')
  const closerImages = sorted.filter((i) => i.role === 'detail')
  const all = [...stripImages, ...closerImages]
  const els = useRef<(HTMLElement | null)[]>([])
  const [viewer, setViewer] = useState<number | null>(null)
  const [active, setActiveState] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)

  const register = useCallback((i: number, el: HTMLElement | null) => {
    els.current[i] = el
  }, [])
  const setActive = useCallback((i: number) => setActiveState(i), [])

  const value: Ctx = {
    stripImages,
    closerImages,
    open: (i) => setViewer(i),
    register,
    active,
    setActive,
    stripRef,
  }

  return (
    <GalleryContext.Provider value={value}>
      {children}
      {viewer !== null ? (
        <Viewer
          images={all}
          start={viewer}
          getOriginRect={(i) => els.current[i]?.querySelector('.art-img')?.getBoundingClientRect()}
          onChange={(i) => {
            // Keep the strip on the same image, so closing returns to it.
            const el = stripRef.current
            if (el && i < stripImages.length) el.scrollTo({ left: i * el.clientWidth, behavior: 'instant' as ScrollBehavior })
          }}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </GalleryContext.Provider>
  )
}

/** Swipeable image strip with a counter and, on desktop, thumbnails. */
export function GalleryStrip({ workId, title }: { workId: string; title: string }) {
  const { stripImages, open, register, active, setActive, stripRef: strip } = useGallery()

  useEffect(() => {
    const el = strip.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [setActive, strip])

  const goTo = (i: number) => {
    const el = strip.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  if (!stripImages.length) return null

  return (
    <div>
      <div
        ref={strip}
        className="strip"
        role="region"
        aria-roledescription="carousel"
        aria-label={`Images of ${title}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') goTo(Math.min(active + 1, stripImages.length - 1))
          if (e.key === 'ArrowLeft') goTo(Math.max(active - 1, 0))
        }}
      >
        {stripImages.map((img, i) => {
          const pic = (
            <div className={img.onMount ? 'on-mount' : undefined} style={{ width: '100%' }}>
              <ArtImage image={img} sizes="(max-width: 899px) 100vw, 58vw" priority={i === 0} />
            </div>
          )
          return (
            <div key={img.id} ref={(el) => register(i, el)} aria-roledescription="slide" aria-label={`${i + 1} of ${stripImages.length}`}>
              <button type="button" className="strip-btn" onClick={() => open(i)} aria-label={`Open image ${i + 1} full screen`}>
                {i === 0 ? (
                  <ViewTransition name={`work-${workId}`} share="morph" default="none">
                    {pic}
                  </ViewTransition>
                ) : (
                  pic
                )}
              </button>
            </div>
          )
        })}
      </div>
      <div className="strip-meta">
        <span>{stripImages.length > 1 ? `${active + 1} / ${stripImages.length}` : ''}</span>
        <button type="button" className="textlink" style={{ fontSize: 13, color: 'var(--graphite)' }} onClick={() => open(active)}>
          View full screen
        </button>
      </div>
      {stripImages.length > 1 ? (
        <div className="thumbs" style={{ marginTop: 12 }}>
          {stripImages.map((img, i) => {
            const v = variantSizes(img.width, img.height)[0]
            return (
              <button key={img.id} type="button" className="thumb" aria-current={i === active} aria-label={`Show image ${i + 1}`} onClick={() => goTo(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img.id, v.size, 'webp')} alt="" loading="lazy" />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/** Close-ups of the surface, in a sideways strip. */
export function CloserStrip() {
  const { closerImages, stripImages, open, register } = useGallery()
  if (!closerImages.length) return null
  return (
    <div className="closer">
      {closerImages.map((img, k) => {
        const i = stripImages.length + k
        return (
          <figure key={img.id} ref={(el) => register(i, el)}>
            <button type="button" onClick={() => open(i)} aria-label="Open close-up full screen">
              <ArtImage image={img} sizes="(max-width: 899px) 78vw, 46vw" />
            </button>
            {img.caption ? <figcaption className="meta">{img.caption}</figcaption> : null}
          </figure>
        )
      })}
    </div>
  )
}
