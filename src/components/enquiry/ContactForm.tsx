'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { track } from '@/lib/enquiry-client'

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'message', string>>

/** The general form on /contact. Uses the same endpoint and checks as the enquiry sheet. */
export function ContactForm({ artistFirstName, replyPromise }: { artistFirstName: string; replyPromise: string }) {
  const [type, setType] = useState<'general' | 'commission'>('general')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [name, setName] = useState('')
  const token = useRef('')

  useEffect(() => {
    fetch('/api/enquiries/token', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => (token.current = d.token || ''))
      .catch(() => {})
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = (k: string) => String(f.get(k) ?? '').trim()
    const next: Errors = {}
    if (v('name').length < 2) next.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) next.email = 'Enter an email address, like name@example.com.'
    if (v('phone') && !/^\+?[\d\s()-]{7,20}$/.test(v('phone'))) next.phone = 'Enter a phone number with digits only, or leave it empty.'
    if (v('message').length < 2) next.message = 'Write a short message.'
    setErrors(next)
    if (Object.keys(next).length) return
    setStatus('sending')
    setFormError('')
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: v('name'),
          email: v('email'),
          phone: v('phone') || undefined,
          message: v('message'),
          pageUrl: location.href,
          referrer: document.referrer || undefined,
          token: token.current,
          website: v('website'),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors)
        setFormError(data.error || 'This did not send. Check your connection and try again.')
        setStatus('error')
        return
      }
      setName(v('name').split(/\s+/)[0])
      setStatus('sent')
      track('enquiry_sent', { type })
    } catch {
      setFormError('This did not send. Check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="sent" role="status">
        <span className="check" aria-hidden="true">✓</span>
        <p className="prose" style={{ fontSize: 22 }}>Thank you, {name}. {artistFirstName} will reply {replyPromise}.</p>
        <p className="muted">A copy of your message is on its way to your inbox.</p>
      </div>
    )
  }

  const field = (id: keyof Errors, label: string, input: React.ReactNode) => (
    <div className="field">
      <label htmlFor={`c-${id}`}>{label}</label>
      {input}
      {errors[id] ? <span id={`c-${id}-err`} className="error">{errors[id]}</span> : null}
    </div>
  )
  const a11y = (id: keyof Errors) => ({ 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `c-${id}-err` : undefined })

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="option-group" role="radiogroup" aria-label="Topic">
        <span className="eyebrow">Topic</span>
        <div className="options">
          <button type="button" className="chip" role="radio" aria-checked={type === 'general'} onClick={() => setType('general')}>General question</button>
          <button type="button" className="chip" role="radio" aria-checked={type === 'commission'} onClick={() => setType('commission')}>Commission</button>
        </div>
      </div>
      {field('name', 'Name', <input id="c-name" name="name" autoComplete="name" {...a11y('name')} />)}
      {field('email', 'Email', <input id="c-email" name="email" type="email" inputMode="email" autoComplete="email" {...a11y('email')} />)}
      {field('phone', 'Phone or WhatsApp (optional)', <input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91" {...a11y('phone')} />)}
      {field('message', 'Message', <textarea id="c-message" name="message" rows={5} maxLength={2000} placeholder={type === 'commission' ? 'The wall, the size and the colours you have in mind.' : undefined} {...a11y('message')} />)}
      <div className="hp" aria-hidden="true">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <div>
        <button type="submit" className="btn" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send message'}</button>
      </div>
      <p className="form-note">{artistFirstName} uses these details only to reply to you. <a href="/privacy">Privacy notice</a></p>
    </form>
  )
}
