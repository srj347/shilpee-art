'use client'

import { useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function SignInForm() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState(params.get('error') === 'link' ? 'This link has expired or was already used. Ask for a new one.' : '')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your email address, like name@example.com.')
      return
    }
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'The link could not be sent. Try again.')
        setState('idle')
        return
      }
      setState('sent')
    } catch {
      setError('No connection. Check the internet and try again.')
      setState('idle')
    }
  }

  return (
    <div className="box">
      <div className="stack" style={{ gap: 8 }}>
        <span className="wordmark">Shilpee Maitra</span>
        <span className="eyebrow">Studio</span>
      </div>
      {state === 'sent' ? (
        <div className="sent" role="status">
          <h1 className="h2" style={{ fontSize: 28 }}>Check your email</h1>
          <p className="muted">
            If {email.trim()} may use Studio, a sign-in link is on its way. It works once, for 15 minutes.
          </p>
          <button type="button" className="textlink" onClick={() => setState('idle')}>Use a different email</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <h1 className="h2" style={{ fontSize: 28 }}>Sign in</h1>
          <div className="field">
            <label htmlFor="si-email">Email</label>
            <input id="si-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'si-err' : undefined} autoFocus />
            {error ? <span id="si-err" className="error">{error}</span> : null}
          </div>
          <button type="submit" className="btn btn-block" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <p className="form-note">No password. We send a link to your email instead.</p>
        </form>
      )}
    </div>
  )
}
