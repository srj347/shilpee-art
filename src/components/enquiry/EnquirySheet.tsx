'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArtImage } from '@/components/art/ArtImage'
import {
  defaultMessage,
  sheetTitle,
  track,
  type EnquiryRequest,
} from '@/lib/enquiry-client'
import type { SheetContact } from './EnquiryProvider'

type Status = 'idle' | 'sending' | 'sent' | 'error'
type FieldErrors = Partial<Record<'name' | 'email' | 'phone' | 'message', string>>
const SAVED_KEY = 'sm.enquirer'
const SNAP = 'cubic-bezier(0.32, 0.72, 0, 1)'

function readSaved(): { name: string; email: string; phone: string } {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}')
    return { name: v.name || '', email: v.email || '', phone: v.phone || '' }
  } catch {
    return { name: '', email: '', phone: '' }
  }
}

function utmSource(): string | undefined {
  try {
    const fromUrl = new URLSearchParams(location.search).get('utm_source')
    if (fromUrl) sessionStorage.setItem('sm.utm', fromUrl)
    return fromUrl || sessionStorage.getItem('sm.utm') || undefined
  } catch {
    return undefined
  }
}

const isPhone = () => window.matchMedia('(max-width: 899px)').matches

/**
 * The enquiry sheet: slides up on phones, in from the right on desktop.
 * Drag the handle down (or the form, from its top) to close.
 * It is mounted fresh for every enquiry, so the form starts clean.
 */
export function EnquirySheet({
  request: req,
  open,
  contact,
  onClose,
  onClosed,
}: {
  request: EnquiryRequest
  open: boolean
  contact: SheetContact
  onClose: () => void
  onClosed: () => void
}) {
  const firstName = contact.artistName.split(' ')[0] || 'Shilpee'
  const [saved] = useState(readSaved)
  const [hadSaved, setHadSaved] = useState(!!saved.email)
  const [fields, setFields] = useState({ ...saved, message: defaultMessage(req, firstName) })
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [sentRef, setSentRef] = useState('')
  const tokenRef = useRef('')
  const sheetRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)

  // A fresh signed token for this form.
  useEffect(() => {
    fetch('/api/enquiries/token', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => (tokenRef.current = d.token || ''))
      .catch(() => {})
  }, [])

  // When closing, unmount after the animation (with a fallback timer).
  useEffect(() => {
    if (open) return
    const t = setTimeout(onClosed, 450)
    return () => clearTimeout(t)
  }, [open, onClosed])

  // Lock page scroll, move focus in, trap Tab, close on Escape.
  useEffect(() => {
    if (!open) return
    const sheet = sheetRef.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const name = sheet?.querySelector<HTMLInputElement>('input[name="name"]')
      if (name && !name.value && !isPhone()) name.focus()
      else sheet?.querySelector<HTMLElement>('.sheet-close')?.focus({ preventScroll: true })
    }, 80)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && sheet) {
        const items = Array.from(
          sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([tabindex="-1"]), textarea'),
        ).filter((el) => el.offsetParent !== null)
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  // Drag down to close (phones).
  useEffect(() => {
    const sheet = sheetRef.current
    const body = bodyRef.current
    if (!sheet || !open) return
    let startY = 0, lastY = 0, lastT = 0, velocity = 0, dragging = false, fromBody = false, captured = -1

    const begin = (y: number) => {
      startY = lastY = y
      lastT = performance.now()
      velocity = 0
      dragging = false
    }
    const move = (y: number): boolean => {
      const dy = y - startY
      if (!dragging) {
        if (dy < 6) return false
        dragging = true
        sheet.style.transition = 'none'
      }
      const now = performance.now()
      velocity = (y - lastY) / Math.max(1, now - lastT)
      lastY = y
      lastT = now
      const d = Math.max(0, dy)
      sheet.style.transform = `translateY(${d}px)`
      if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, 1 - d / sheet.offsetHeight))
      return true
    }
    const end = () => {
      if (!dragging) return
      dragging = false
      const d = lastY - startY
      if (d > sheet.offsetHeight * 0.28 || velocity > 0.55) {
        if (navigator.vibrate) navigator.vibrate(8)
        onClose() // the closing animation continues from where the finger left it
        return
      }
      sheet.style.transition = `transform 260ms ${SNAP}`
      sheet.style.transform = ''
      if (scrimRef.current) {
        scrimRef.current.style.transition = 'opacity 260ms ease-out'
        scrimRef.current.style.opacity = ''
      }
    }

    const handles = Array.from(sheet.querySelectorAll<HTMLElement>('.sheet-grab, .sheet-head'))
    const onDown = (e: PointerEvent) => {
      if (!isPhone() || (e.target as HTMLElement).closest('button')) return
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {}
      begin(e.clientY)
      captured = e.pointerId
    }
    const onMove = (e: PointerEvent) => {
      if (captured === e.pointerId) move(e.clientY)
    }
    const onUp = () => {
      captured = -1
      end()
    }
    handles.forEach((h) => {
      h.addEventListener('pointerdown', onDown)
      h.addEventListener('pointermove', onMove)
      h.addEventListener('pointerup', onUp)
      h.addEventListener('pointercancel', onUp)
    })

    const onTouchStart = (e: TouchEvent) => {
      fromBody = isPhone() && !!body && body.scrollTop <= 0
      if (fromBody) begin(e.touches[0].clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!fromBody) return
      if (move(e.touches[0].clientY)) e.preventDefault()
      else if (e.touches[0].clientY < startY) fromBody = false // moving up: let the form scroll
    }
    const onTouchEnd = () => {
      if (fromBody) end()
      fromBody = false
    }
    body?.addEventListener('touchstart', onTouchStart, { passive: true })
    body?.addEventListener('touchmove', onTouchMove, { passive: false })
    body?.addEventListener('touchend', onTouchEnd)
    body?.addEventListener('touchcancel', onTouchEnd)

    return () => {
      handles.forEach((h) => {
        h.removeEventListener('pointerdown', onDown)
        h.removeEventListener('pointermove', onMove)
        h.removeEventListener('pointerup', onUp)
        h.removeEventListener('pointercancel', onUp)
      })
      body?.removeEventListener('touchstart', onTouchStart)
      body?.removeEventListener('touchmove', onTouchMove)
      body?.removeEventListener('touchend', onTouchEnd)
      body?.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [open, onClose])

  const set = (k: keyof typeof fields) => (e: { target: { value: string } }) => {
    setFields((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k as keyof FieldErrors]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const next: FieldErrors = {}
    if (fields.name.trim().length < 2) next.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) next.email = 'Enter an email address, like name@example.com.'
    if (fields.phone && !/^\+?[\d\s()-]{7,20}$/.test(fields.phone.trim())) next.phone = 'Enter a phone number with digits only, or leave it empty.'
    setErrors(next)
    if (Object.keys(next).length) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setStatus('sending')
    setFormError('')
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: req.type,
          artworkId: req.artwork?.id,
          variantId: req.print?.variantId,
          name: fields.name.trim(),
          email: fields.email.trim(),
          phone: fields.phone.trim() || undefined,
          message: fields.message.trim(),
          pageUrl: location.href,
          referrer: document.referrer || undefined,
          utmSource: utmSource(),
          token: tokenRef.current,
          website: (form.elements.namedItem('website') as HTMLInputElement | null)?.value || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors)
        setFormError(data.error || 'This did not send. Check your connection and try again. Your message is still here.')
        setStatus('error')
        return
      }
      try {
        localStorage.setItem(
          SAVED_KEY,
          JSON.stringify({ name: fields.name.trim(), email: fields.email.trim(), phone: fields.phone.trim() }),
        )
      } catch {}
      setSentRef(data.ref || '')
      setStatus('sent')
      track('enquiry_sent', { type: req.type })
      if (navigator.vibrate) navigator.vibrate([10, 40, 10])
    } catch {
      setFormError('This did not send. Check your connection and try again. Your message is still here.')
      setStatus('error')
    }
  }

  function clearSaved() {
    try {
      localStorage.removeItem(SAVED_KEY)
    } catch {}
    setHadSaved(false)
    setFields((f) => ({ ...f, name: '', email: '', phone: '' }))
  }

  const ig = contact.instagram
  const first = fields.name.trim().split(/\s+/)[0]
  const state = open ? 'is-open' : 'is-closing'

  return (
    <>
      <div ref={scrimRef} className={`sheet-scrim ${state}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={`sheet ${state}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-title"
        onAnimationEnd={(e) => {
          if (!open && e.target === e.currentTarget) onClosed()
        }}
      >
        <div className="sheet-grab" aria-hidden="true">
          <span />
        </div>
        <div className="sheet-head">
          <h2 id="enquiry-title" className="h3" style={{ fontSize: 18 }}>
            {status === 'sent' ? 'Sent' : sheetTitle(req)}
          </h2>
          <button type="button" className="sheet-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div ref={bodyRef} className="sheet-body">
          {req.artwork ? (
            <div className="ctx">
              {req.artwork.image ? <ArtImage image={req.artwork.image} sizes="64px" showPreviewTag={false} /> : null}
              <div className="label">
                <span className="t">
                  {req.artwork.title}, <span className="y">{req.artwork.year}</span>
                </span>
                <span className="m">{req.print ? req.print.label : req.artwork.meta}</span>
              </div>
            </div>
          ) : null}

          {status === 'sent' ? (
            <div className="sent" role="status">
              <span className="check" aria-hidden="true">✓</span>
              <p className="prose" style={{ fontSize: 20 }}>
                Thank you{first ? `, ${first}` : ''}. {firstName} will reply {contact.replyPromise}.
              </p>
              <p className="muted">
                A copy is on its way to {fields.email.trim()}.{sentRef ? ` Your reference is ${sentRef}.` : ''}
              </p>
              <div className="link-row">
                {ig ? (
                  <a className="textlink" href={ig} target="_blank" rel="noopener" onClick={() => track('instagram_click', { from: 'sent' })}>
                    Continue on Instagram
                  </a>
                ) : null}
                <button type="button" className="textlink" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate>
              {hadSaved ? (
                <p className="form-note">
                  Your details are filled in from your last message.{' '}
                  <button type="button" className="textlink" style={{ fontSize: 12 }} onClick={clearSaved}>
                    Not you? Clear
                  </button>
                </p>
              ) : null}
              <div className="field">
                <label htmlFor="enq-name">Name</label>
                <input id="enq-name" name="name" autoComplete="name" value={fields.name} onChange={set('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'enq-name-err' : undefined} />
                {errors.name ? <span id="enq-name-err" className="error">{errors.name}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="enq-email">Email</label>
                <input id="enq-email" name="email" type="email" inputMode="email" autoComplete="email" value={fields.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'enq-email-err' : undefined} />
                {errors.email ? <span id="enq-email-err" className="error">{errors.email}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="enq-phone">Phone or WhatsApp (optional)</label>
                <input id="enq-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91" value={fields.phone} onChange={set('phone')} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'enq-phone-err' : undefined} />
                {errors.phone ? <span id="enq-phone-err" className="error">{errors.phone}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="enq-message">Message</label>
                <textarea id="enq-message" name="message" rows={4} maxLength={2000} value={fields.message} onChange={set('message')} />
              </div>
              <div className="hp" aria-hidden="true">
                <label htmlFor="enq-website">Website</label>
                <input id="enq-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              {formError ? <p className="form-error" role="alert">{formError}</p> : null}
              <button type="submit" className="btn btn-block" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : req.type === 'upcoming' ? 'Register interest' : 'Send enquiry'}
              </button>
              <p className="form-note">
                {firstName} uses these details only to reply to you. <a href="/privacy">Privacy notice</a>
              </p>
              {ig ? (
                <a className="textlink" href={ig} target="_blank" rel="noopener" onClick={() => track('instagram_click', { from: 'sheet' })}>
                  Or ask on Instagram
                </a>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </>
  )
}
