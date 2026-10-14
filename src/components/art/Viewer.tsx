'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { srcSet } from '@/lib/media'
import type { ArtImage } from '@/lib/types'

type Props = {
  images: ArtImage[]
  start: number
  /** Screen rectangle of the thumbnail for image i, so the viewer can grow from it and return to it. */
  getOriginRect?: (i: number) => DOMRect | undefined
  onChange?: (i: number) => void
  onClose: () => void
}

type Box = { w: number; h: number }
type Mode = 'none' | 'pending' | 'swipe' | 'dismiss' | 'pan' | 'pinch'

const MAX_SCALE = 5
const SNAP = 'cubic-bezier(0.32, 0.72, 0, 1)'
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function caption(img: ArtImage): string {
  if (img.caption) return img.caption
  return { main: '', view: 'Another view', detail: 'Detail', room: 'In a room', wip: 'In progress' }[img.role] ?? ''
}

/** Size of an image fitted inside the slide box (may scale up a little to fill). */
function fit(img: ArtImage, box: Box) {
  const s = Math.min(box.w / img.width, box.h / img.height)
  return { w: Math.round(img.width * s), h: Math.round(img.height * s) }
}

/**
 * Full-screen viewer.
 * Touch: swipe sideways to change image, pinch or double-tap to zoom, drag to pan,
 * drag down to close. Mouse: click to zoom, drag to pan, trackpad pinch, arrow keys.
 */
export function Viewer({ images, start, getOriginRect, onChange, onClose }: Props) {
  const [idx, setIdx] = useState(start)
  const [zoomed, setZoomed] = useState(false)
  const [box, setBox] = useState<Box | null>(null)
  const [vw, setVw] = useState(0)

  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const bg = useRef<HTMLDivElement>(null)
  const ui = useRef<HTMLDivElement[]>([])
  const imgs = useRef<(HTMLImageElement | null)[]>([])
  const idxRef = useRef(start)
  const z = useRef({ s: 1, tx: 0, ty: 0 })
  const closing = useRef(false)

  const current = () => imgs.current[idxRef.current]

  // Measure the slide's content box: the area an image may fill.
  const measure = useCallback(() => {
    const el = root.current
    if (!el) return
    const slide = el.querySelector<HTMLElement>('.viewer-slide')
    if (!slide) return
    const cs = getComputedStyle(slide)
    const w = slide.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const h = slide.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    setBox({ w, h })
    setVw(el.clientWidth)
  }, [])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const setTrack = useCallback((x: number, animate: boolean) => {
    const t = track.current
    if (!t) return
    t.style.transition = animate ? `transform 300ms ${SNAP}` : 'none'
    t.style.transform = `translate3d(${x}px,0,0)`
  }, [])

  useLayoutEffect(() => {
    if (vw) setTrack(-idxRef.current * vw, false)
  }, [vw, setTrack])

  const applyZoom = useCallback((animate = false) => {
    const im = current()
    if (!im) return
    const { s, tx, ty } = z.current
    im.style.transition = animate ? `transform 260ms ${SNAP}` : 'none'
    im.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${s})`
  }, [])

  const resetZoom = useCallback(
    (animate: boolean) => {
      z.current = { s: 1, tx: 0, ty: 0 }
      applyZoom(animate)
      setZoomed(false)
    },
    [applyZoom],
  )

  /** The image's rectangle without zoom applied. */
  const baseRect = () => {
    const im = current()!
    const r = im.getBoundingClientRect()
    const { s, tx, ty } = z.current
    return { left: r.left - tx, top: r.top - ty, w: r.width / s, h: r.height / s }
  }

  /** Keep a zoomed image covering the screen; centre it when it is smaller. */
  const clampPan = (b: ReturnType<typeof baseRect>, s: number, tx: number, ty: number, rubber: boolean) => {
    const axis = (t: number, base: number, size: number, scaled: number, view: number) => {
      let min: number, max: number
      if (scaled <= view) min = max = base + (size - scaled) / 2
      else {
        min = view - scaled
        max = 0
      }
      let p = base + t
      if (p < min) p = rubber ? min - (min - p) * 0.3 : min
      if (p > max) p = rubber ? max + (p - max) * 0.3 : max
      return p - base
    }
    return {
      tx: axis(tx, b.left, b.w, b.w * s, window.innerWidth),
      ty: axis(ty, b.top, b.h, b.h * s, window.innerHeight),
    }
  }

  const loadSharper = (s: number) => {
    const im = current()
    if (im && box) im.sizes = `${Math.ceil(fit(images[idxRef.current], box).w * s)}px`
  }

  const zoomAt = useCallback(
    (cx: number, cy: number, s2: number, animate: boolean) => {
      const im = current()
      if (!im) return
      if (s2 <= 1.02) return resetZoom(animate)
      const b = baseRect()
      const { s, tx, ty } = z.current
      const lx = (cx - b.left - tx) / s
      const ly = (cy - b.top - ty) / s
      const next = clampPan(b, s2, cx - b.left - lx * s2, cy - b.top - ly * s2, false)
      z.current = { s: s2, ...next }
      applyZoom(animate)
      setZoomed(true)
      loadSharper(s2)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyZoom, resetZoom, box],
  )

  const go = useCallback(
    (i: number) => {
      const n = clamp(i, 0, images.length - 1)
      if (n !== idxRef.current) {
        resetZoom(false)
        idxRef.current = n
        setIdx(n)
        onChange?.(n)
      }
      setTrack(-n * (root.current?.clientWidth || vw), true)
    },
    [images.length, onChange, resetZoom, setTrack, vw],
  )

  const setChrome = (opacity: number | '') => {
    ui.current.forEach((el) => el && (el.style.opacity = opacity === '' ? '' : String(opacity)))
  }

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    const im = current()
    const origin = getOriginRect?.(idxRef.current)
    const done = () => onClose()
    setChrome(0)
    bg.current?.animate([{ opacity: getComputedStyle(bg.current).opacity }, { opacity: 0 }], { duration: 240, fill: 'forwards' })
    if (im && origin && origin.width > 0 && z.current.s === 1) {
      const from = im.style.transform || 'none'
      im.style.transition = 'none'
      im.style.transform = 'none'
      const r = im.getBoundingClientRect() // layout box, without the drag offset
      im.style.transform = from
      im.animate(
        [
          { transform: from },
          { transform: `translate3d(${origin.left - r.left}px,${origin.top - r.top}px,0) scale(${origin.width / r.width})` },
        ],
        { duration: 280, easing: SNAP, fill: 'forwards' },
      ).onfinish = done
    } else {
      const anim = root.current?.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.98)' }], { duration: 180, fill: 'forwards' })
      if (anim) anim.onfinish = done
      else done()
    }
  }, [getOriginRect, onClose])

  // Grow from the thumbnail on open.
  useLayoutEffect(() => {
    if (!box) return
    const im = imgs.current[start]
    const origin = getOriginRect?.(start)
    bg.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
    if (!im || !origin || origin.width === 0) {
      root.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 })
      return
    }
    const r = im.getBoundingClientRect()
    im.animate(
      [
        { transform: `translate3d(${origin.left - r.left}px,${origin.top - r.top}px,0) scale(${origin.width / r.width})` },
        { transform: 'translate3d(0,0,0) scale(1)' },
      ],
      { duration: 320, easing: SNAP },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box === null])

  // Pointer gestures.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const pointers = new Map<number, { x: number; y: number }>()
    let mode: Mode = 'none'
    let sx = 0, sy = 0, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0, moved = false
    let tx0 = 0, ty0 = 0, d0 = 1, s0 = 1, mid0 = { x: 0, y: 0 }
    let b = { left: 0, top: 0, w: 0, h: 0 }
    let lastTap: { t: number; x: number; y: number } | null = null

    const dist = () => {
      const [a, c] = Array.from(pointers.values())
      return Math.hypot(a.x - c.x, a.y - c.y) || 1
    }
    const mid = () => {
      const [a, c] = Array.from(pointers.values())
      return { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }
    }
    const startSingle = (x: number, y: number) => {
      sx = lx = x
      sy = ly = y
      lt = performance.now()
      vx = vy = 0
      moved = false
      tx0 = z.current.tx
      ty0 = z.current.ty
      b = baseRect()
      mode = z.current.s > 1 ? 'pan' : 'pending'
    }

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, a') || closing.current) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // capture is a convenience; gestures still work without it
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        if (mode === 'swipe') setTrack(-idxRef.current * el.clientWidth, true)
        mode = 'pinch'
        d0 = dist()
        s0 = z.current.s
        mid0 = mid()
        tx0 = z.current.tx
        ty0 = z.current.ty
        b = baseRect()
      } else if (pointers.size === 1) {
        startSingle(e.clientX, e.clientY)
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const im = current()
      if (!im) return

      if (mode === 'pinch' && pointers.size >= 2) {
        const m = mid()
        const s = clamp((s0 * dist()) / d0, 0.8, MAX_SCALE)
        const px = (mid0.x - b.left - tx0) / s0
        const py = (mid0.y - b.top - ty0) / s0
        z.current = { s, tx: mid0.x - b.left - px * s + (m.x - mid0.x), ty: mid0.y - b.top - py * s + (m.y - mid0.y) }
        applyZoom(false)
        return
      }

      const now = performance.now()
      const dt = Math.max(1, now - lt)
      vx = (e.clientX - lx) / dt
      vy = (e.clientY - ly) / dt
      lx = e.clientX
      ly = e.clientY
      lt = now
      const dx = e.clientX - sx
      const dy = e.clientY - sy
      if (Math.abs(dx) + Math.abs(dy) > 8) moved = true

      if (mode === 'pending' && moved) {
        if (Math.abs(dx) > Math.abs(dy)) mode = images.length > 1 ? 'swipe' : 'none'
        else mode = dy > 0 ? 'dismiss' : 'none'
      }
      if (mode === 'swipe') {
        const atEdge = (idxRef.current === 0 && dx > 0) || (idxRef.current === images.length - 1 && dx < 0)
        setTrack(-idxRef.current * el.clientWidth + (atEdge ? dx * 0.3 : dx), false)
      } else if (mode === 'dismiss') {
        const d = Math.max(0, dy)
        const p = Math.min(1, d / window.innerHeight)
        im.style.transition = 'none'
        im.style.transform = `translate3d(${dx * 0.4}px,${d}px,0) scale(${1 - p * 0.25})`
        if (bg.current) bg.current.style.opacity = String(1 - Math.min(1, d / 360) * 0.9)
        setChrome(1 - Math.min(1, d / 120))
      } else if (mode === 'pan') {
        const next = clampPan(b, z.current.s, tx0 + dx, ty0 + dy, true)
        z.current = { ...z.current, ...next }
        applyZoom(false)
      }
    }

    const settleZoom = () => {
      if (z.current.s < 1.05) return resetZoom(true)
      const s = Math.min(z.current.s, MAX_SCALE)
      const next = clampPan(baseRect(), s, z.current.tx, z.current.ty, false)
      z.current = { s, ...next }
      applyZoom(true)
      setZoomed(true)
      loadSharper(s)
    }

    const onUp = (e: PointerEvent, cancelled = false) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      const im = current()

      if (mode === 'pinch') {
        if (pointers.size === 1) {
          const [p] = Array.from(pointers.values())
          settleZoom()
          startSingle(p.x, p.y)
          moved = true
        } else if (pointers.size === 0) {
          settleZoom()
          mode = 'none'
        }
        return
      }
      if (pointers.size > 0) return

      const dx = e.clientX - sx
      const dy = e.clientY - sy
      if (!moved && !cancelled) {
        const now = performance.now()
        if (e.pointerType === 'mouse') {
          if (z.current.s > 1) resetZoom(true)
          else zoomAt(e.clientX, e.clientY, 2.2, true)
        } else if (lastTap && now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
          if (z.current.s > 1) resetZoom(true)
          else zoomAt(e.clientX, e.clientY, 2.5, true)
          lastTap = null
        } else {
          lastTap = { t: now, x: e.clientX, y: e.clientY }
        }
      } else if (mode === 'swipe') {
        const w = el.clientWidth
        let n = idxRef.current
        if (dx < -w * 0.18 || vx < -0.45) n += 1
        else if (dx > w * 0.18 || vx > 0.45) n -= 1
        go(n)
      } else if (mode === 'dismiss' && im) {
        if (!cancelled && (dy > 110 || vy > 0.5)) {
          close()
        } else {
          im.style.transition = `transform 260ms ${SNAP}`
          im.style.transform = 'translate3d(0,0,0) scale(1)'
          if (bg.current) bg.current.style.opacity = ''
          setChrome('')
        }
      } else if (mode === 'pan') {
        settleZoom()
      }
      mode = 'none'
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        zoomAt(e.clientX, e.clientY, clamp(z.current.s * Math.exp(-e.deltaY * 0.012), 1, MAX_SCALE), false)
      } else if (z.current.s > 1) {
        e.preventDefault()
        const next = clampPan(baseRect(), z.current.s, z.current.tx - e.deltaX, z.current.ty - e.deltaY, false)
        z.current = { ...z.current, ...next }
        applyZoom(false)
      }
    }

    const up = (e: PointerEvent) => onUp(e)
    const cancel = (e: PointerEvent) => onUp(e, true)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
      el.removeEventListener('wheel', onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, go, close, zoomAt, resetZoom, applyZoom, setTrack, box])

  // Keyboard, focus and page scroll lock.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.querySelector<HTMLElement>('.viewer-close')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(idxRef.current + 1)
      else if (e.key === 'ArrowLeft') go(idxRef.current - 1)
      else if (e.key === '+' || e.key === '=') zoomAt(window.innerWidth / 2, window.innerHeight / 2, Math.min(MAX_SCALE, z.current.s * 1.6), true)
      else if (e.key === '-') resetZoom(true)
      else if (e.key === 'Tab') {
        const items = Array.from(root.current?.querySelectorAll<HTMLElement>('button') ?? [])
        if (!items.length) return
        const i = items.indexOf(document.activeElement as HTMLElement)
        e.preventDefault()
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [close, go, zoomAt, resetZoom])

  const img = images[idx]
  const cap = caption(img)

  return (
    <div ref={root} className={`viewer${zoomed ? ' is-zoomed' : ''}`} role="dialog" aria-modal="true" aria-label="Image viewer">
      <div ref={bg} className="viewer-bg" />
      <div ref={track} className="viewer-track">
        {images.map((im, i) => {
          const size = box ? fit(im, box) : null
          return (
            <div key={im.id} className="viewer-slide" aria-hidden={i !== idx}>
              {size ? (
                <img
                  ref={(node) => {
                    imgs.current[i] = node
                  }}
                  srcSet={srcSet(im, 'webp')}
                  sizes={`${size.w}px`}
                  alt={im.alt}
                  width={size.w}
                  height={size.h}
                  style={{
                    width: size.w,
                    height: size.h,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    backgroundColor: im.dominant,
                    backgroundImage: im.lqip ? `url("${im.lqip}")` : undefined,
                    backgroundSize: 'cover',
                  }}
                  loading={Math.abs(i - idx) <= 1 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="viewer-ui top" ref={(n) => { if (n) ui.current[0] = n }}>
        <span className="meta">{images.length > 1 ? `${idx + 1} / ${images.length}` : ''}</span>
        <button type="button" className="viewer-close" onClick={close}>Close</button>
      </div>
      <div className="viewer-ui bottom" ref={(n) => { if (n) ui.current[1] = n }}>
        <span>
          {cap}
          {img.isDigitalPreview ? `${cap ? ' · ' : ''}Digital preview` : ''}
        </span>
        <span className="viewer-nav">
          <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0}>Previous</button>
          <button type="button" onClick={() => go(idx + 1)} disabled={idx === images.length - 1}>Next</button>
        </span>
        <span className="visually-hidden" aria-live="polite">{`Image ${idx + 1} of ${images.length}`}</span>
      </div>
    </div>
  )
}
