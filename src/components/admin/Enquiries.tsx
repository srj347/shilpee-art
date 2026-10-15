'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { imageUrl } from '@/lib/media'
import type { Enquiry, EnquiryStatus } from '@/lib/types'
import { api, ApiError } from './api'
import { useStudio } from './StudioShell'

const TYPE: Record<string, string> = {
  original: 'Original',
  print: 'Print',
  commission: 'Commission',
  upcoming: 'Interest',
  general: 'Message',
}
const FILTERS: { key: EnquiryStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'replied', label: 'Replied' },
  { key: 'closed', label: 'Closed' },
  { key: 'spam', label: 'Spam' },
]

function when(iso: string): string {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 864e5)
  if (days < 1) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function EnquiriesInbox() {
  const [filter, setFilter] = useState<EnquiryStatus | 'all'>('all')
  const [items, setItems] = useState<Enquiry[] | null>(null)
  const [error, setError] = useState('')
  const { setNewCount } = useStudio()

  useEffect(() => {
    api<{ enquiries: Enquiry[]; newCount: number }>(`/api/admin/enquiries${filter === 'all' ? '' : `?status=${filter}`}`)
      .then((d) => {
        setItems(d.enquiries)
        setNewCount(d.newCount)
      })
      .catch((e: ApiError) => setError(e.message))
  }, [filter, setNewCount])

  return (
    <div className="studio-main">
      <div className="studio-head"><h1>Enquiries</h1></div>
      <div className="tabs-row" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => { setItems(null); setFilter(f.key) }}>
            {f.label}
          </button>
        ))}
      </div>
      {error ? <p className="error-box">{error}</p> : null}
      {!items ? (
        <p className="muted" aria-busy="true">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">{filter === 'all' ? 'No enquiries yet. They appear here as soon as someone writes.' : 'Nothing here.'}</p>
      ) : (
        <ul className="rows">
          {items.map((q) => (
            <li key={q.id} className={`rowi no-handle${q.status === 'new' ? ' is-new' : ''}`}>
              {q.artwork?.thumbId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb56" src={imageUrl(q.artwork.thumbId, 480, 'webp')} alt="" />
              ) : (
                <span className="thumb56" aria-hidden="true" />
              )}
              <Link href={`/admin/enquiries/${q.id}`} className="main">
                <span className="ttl" style={{ fontFamily: 'var(--sans)', fontStyle: 'normal', fontSize: 15 }}>
                  {q.status === 'new' ? <span className="dot sold" style={{ marginRight: 8 }} aria-label="New" /> : null}
                  {q.name}
                </span>
                <span className="sub">
                  <span>{TYPE[q.type]}{q.artwork ? ` · ${q.artwork.title}` : ''}</span>
                </span>
                <span className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{q.message}</span>
              </Link>
              <span className="meta">{when(q.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function EnquiryDetail({ id }: { id: string }) {
  const [q, setQ] = useState<Enquiry | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const { toast } = useStudio()

  const patch = useCallback(
    async (body: { status?: EnquiryStatus; artistNote?: string }, done?: string) => {
      try {
        const d = await api<{ enquiry: Enquiry }>(`/api/admin/enquiries/${id}`, { method: 'PATCH', json: body })
        setQ(d.enquiry)
        if (done) toast(done)
      } catch (e) {
        toast((e as ApiError).message)
      }
    },
    [id, toast],
  )

  useEffect(() => {
    api<{ enquiry: Enquiry }>(`/api/admin/enquiries/${id}`)
      .then((d) => {
        setQ(d.enquiry)
        setNote(d.enquiry.artistNote ?? '')
        // Opening a new enquiry does not change it; she marks it replied herself.
      })
      .catch((e: ApiError) => setError(e.message))
  }, [id])

  if (error) return <div className="studio-main"><p className="error-box">{error}</p></div>
  if (!q) return <div className="studio-main"><p className="muted">Loading…</p></div>

  const first = q.name.split(' ')[0]
  const subject = q.artwork ? `Re: ${q.artwork.title}` : 'Re: your message'
  const phoneDigits = q.phone?.replace(/\D/g, '') ?? ''
  const wa = phoneDigits ? `https://wa.me/${phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits}` : ''
  const created = new Date(q.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="studio-main">
      <div className="studio-head">
        <Link href="/admin/enquiries" className="back-link muted">← Enquiries</Link>
        <span className="pill">{q.status === 'new' ? 'New' : q.status[0].toUpperCase() + q.status.slice(1)} · {q.ref}</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 400, margin: 0 }}>{q.name}</h1>
      <dl className="kv">
        <dt>About</dt>
        <dd>
          {TYPE[q.type]}
          {q.artwork ? (
            <> · <Link href={`/admin/works/${q.artwork.id}`} className="textlink"><em>{q.artwork.title}</em></Link> ({q.artwork.ref})</>
          ) : null}
          {q.print ? <><br />{q.print.label}</> : null}
          {q.artwork?.priceShown ? <><br /><span className="muted">Shown: {q.artwork.priceShown}</span></> : null}
        </dd>
        <dt>Email</dt>
        <dd><a href={`mailto:${q.email}`}>{q.email}</a></dd>
        {q.phone ? (<><dt>Phone</dt><dd>{q.phone}</dd></>) : null}
        <dt>Sent</dt>
        <dd>{created}</dd>
        <dt>From</dt>
        <dd className="muted">{q.utmSource || (q.referrer ? new URL(q.referrer).hostname : 'direct')} · {q.pageUrl.replace(/^https?:\/\/[^/]+/, '') || '/'}</dd>
      </dl>
      <p className="quote">{q.message || '(no message)'}</p>
      {q.mail.toArtist === 'failed' || q.mail.toVisitor === 'failed' ? (
        <p className="notice">The email copy did not send yet ({q.mail.attempts} tries). Studio keeps trying. Reply from here meanwhile.</p>
      ) : null}
      <div className="link-row">
        <a className="btn" href={`mailto:${q.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Dear ${first},\n\n`)}`}>Reply by email</a>
        {wa ? <a className="btn btn-ghost" href={wa} target="_blank" rel="noopener">WhatsApp</a> : null}
      </div>
      <div className="link-row">
        {q.status !== 'replied' ? <button type="button" className="textlink" onClick={() => patch({ status: 'replied' }, 'Marked as replied')}>Mark as replied</button> : null}
        {q.status !== 'closed' ? <button type="button" className="textlink" onClick={() => patch({ status: 'closed' }, 'Closed')}>Close</button> : null}
        {q.status !== 'new' ? <button type="button" className="textlink" onClick={() => patch({ status: 'new' }, 'Marked as new')}>Mark as new</button> : null}
        {q.status !== 'spam' ? <button type="button" className="textlink" style={{ color: 'var(--red-dot)' }} onClick={() => patch({ status: 'spam' }, 'Moved to spam')}>Spam</button> : null}
      </div>
      <div className="field">
        <label htmlFor="q-note">Private note</label>
        <textarea id="q-note" rows={3} value={note} placeholder="Only you see this, e.g. sent daylight photos on 16 Oct" onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (q.artistNote ?? '') && patch({ artistNote: note }, 'Note saved')} />
      </div>
    </div>
  )
}
