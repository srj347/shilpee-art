'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { availabilityLabel } from '@/lib/format'
import { imageUrl, variantSizes } from '@/lib/media'
import { mainImage } from '@/lib/selectors'
import type { Artwork, Availability } from '@/lib/types'
import { api, ApiError } from './api'
import { useStudio } from './StudioShell'

type Row = Artwork & { interest: number }
type Tab = 'all' | 'drafts' | 'live' | 'upcoming' | 'sold'

const TABS: { key: Tab; label: string; test: (w: Row) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'drafts', label: 'Drafts', test: (w) => !w.isPublished },
  { key: 'live', label: 'On website', test: (w) => w.isPublished },
  { key: 'upcoming', label: 'Upcoming', test: (w) => w.availability === 'upcoming' },
  { key: 'sold', label: 'Sold', test: (w) => w.availability === 'sold' },
]

function Thumb({ work }: { work: Artwork }) {
  const img = mainImage(work)
  if (!img) return <span className="thumb56" aria-hidden="true" />
  const v = variantSizes(img.width, img.height)[0]
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="thumb56" src={imageUrl(img.id, v.size, 'webp')} alt="" loading="lazy" style={{ background: img.dominant }} />
}

export function WorksList() {
  const router = useRouter()
  const { toast } = useStudio()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<Row | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reorder, setReorder] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  const load = useCallback(() => {
    api<{ artworks: Row[] }>('/api/admin/artworks')
      .then((d) => setRows(d.artworks))
      .catch((e: ApiError) => setError(e.message))
  }, [])
  useEffect(load, [load])

  async function quick(w: Row, patch: Partial<Pick<Artwork, 'availability' | 'isPublished' | 'featured' | 'isHero'>>, done: string) {
    setMenu(null)
    const before = rows
    setRows((rs) => rs?.map((r) => (r.id === w.id ? { ...r, ...patch } : patch.isHero ? { ...r, isHero: false } : r)) ?? rs)
    try {
      await api(`/api/admin/artworks/${w.id}`, { method: 'PATCH', json: patch })
      toast(done)
    } catch (e) {
      setRows(before)
      toast((e as ApiError).message)
    }
  }

  async function remove(w: Row) {
    setMenu(null)
    setConfirmDelete(false)
    try {
      await api(`/api/admin/artworks/${w.id}`, { method: 'DELETE' })
      setRows((rs) => rs?.filter((r) => r.id !== w.id) ?? rs)
      toast(`${w.title} deleted`)
    } catch (e) {
      toast((e as ApiError).message)
    }
  }

  // Drag to reorder: pointer events on the handle, other rows slide out of the way.
  function startDrag(e: React.PointerEvent, index: number) {
    if (!rows || !listRef.current) return
    e.preventDefault()
    const items = Array.from(listRef.current.children) as HTMLElement[]
    const row = items[index]
    const h = row.getBoundingClientRect().height
    const startY = e.clientY
    let target = index
    row.classList.add('is-dragging')
    const handle = e.currentTarget as HTMLElement
    try {
      handle.setPointerCapture(e.pointerId)
    } catch {}
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY
      row.style.transform = `translateY(${dy}px)`
      target = Math.max(0, Math.min(items.length - 1, index + Math.round(dy / h)))
      items.forEach((el, i) => {
        if (i === index) return
        const shift = index < target && i > index && i <= target ? -h : index > target && i < index && i >= target ? h : 0
        el.style.transition = 'transform 160ms var(--ease-out)'
        el.style.transform = shift ? `translateY(${shift}px)` : ''
      })
    }
    const up = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)
      items.forEach((el) => {
        el.style.transition = 'none'
        el.style.transform = ''
      })
      row.classList.remove('is-dragging')
      requestAnimationFrame(() => items.forEach((el) => (el.style.transition = '')))
      if (target !== index) {
        setRows((rs) => {
          if (!rs) return rs
          const next = [...rs]
          const [moved] = next.splice(index, 1)
          next.splice(target, 0, moved)
          return next
        })
        if (navigator.vibrate) navigator.vibrate(6)
      }
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
  }

  async function saveOrder() {
    if (!rows) return
    try {
      await api('/api/admin/artworks/reorder', { method: 'POST', json: { ids: rows.map((r) => r.id) } })
      setReorder(false)
      toast('New order saved. The website shows it now.')
    } catch (e) {
      toast((e as ApiError).message)
    }
  }

  if (error) return <div className="studio-main"><p className="error-box">{error}</p></div>
  if (!rows) return <div className="studio-main" aria-busy="true"><p className="muted">Loading works…</p></div>

  const q = query.trim().toLowerCase()
  const shown = reorder ? rows : rows.filter(TABS.find((t) => t.key === tab)!.test).filter((w) => !q || `${w.title} ${w.ref} ${w.medium}`.toLowerCase().includes(q))

  const statusAction = (w: Row, a: Availability, label: string) =>
    w.availability !== a ? (
      <button type="button" onClick={() => quick(w, { availability: a }, `${w.title}: ${availabilityLabel(a).toLowerCase()}`)}>{label}</button>
    ) : null

  return (
    <div className="studio-main">
      <div className="studio-head">
        <h1>Works</h1>
        {reorder ? (
          <div className="link-row">
            <button type="button" className="textlink" onClick={() => { setReorder(false); load() }}>Cancel</button>
            <button type="button" className="btn" onClick={saveOrder}>Save order</button>
          </div>
        ) : (
          <div className="link-row">
            <button type="button" className="textlink" onClick={() => { setReorder(true); setQuery(''); setTab('all') }}>Reorder</button>
            <Link href="/admin/works/new" className="btn">Add work</Link>
          </div>
        )}
      </div>

      {reorder ? (
        <p className="notice">Drag ☰ to change the order. The website shows works in this order.</p>
      ) : (
        <>
          <div className="tabs-row" role="group" aria-label="Show">
            {TABS.map((t) => (
              <button key={t.key} type="button" className="chip" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label} <span className="muted" style={{ marginLeft: 6 }}>{rows.filter(t.test).length}</span>
              </button>
            ))}
          </div>
          <input className="search" type="search" placeholder="Search by title or reference" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search works" />
        </>
      )}

      {shown.length === 0 ? (
        <div className="empty">
          <p className="muted">{rows.length === 0 ? 'No works yet. Add the first one; it takes about three minutes.' : 'No works match.'}</p>
          {rows.length === 0 ? <Link href="/admin/works/new" className="btn" style={{ alignSelf: 'flex-start' }}>Add work</Link> : null}
        </div>
      ) : (
        <ul className="rows" ref={listRef}>
          {shown.map((w, i) => (
            <li key={w.id} className={`rowi${reorder ? '' : ' no-handle'}`}>
              {reorder ? (
                <button type="button" className="handle" aria-label={`Move ${w.title}`} onPointerDown={(e) => startDrag(e, i)}>☰</button>
              ) : null}
              <Thumb work={w} />
              <Link href={`/admin/works/${w.id}`} className="main" onClick={(e) => reorder && e.preventDefault()}>
                <span className="ttl">{w.title}</span>
                <span className="sub">
                  <span className={`pill ${w.isPublished ? 'live' : 'draft'}`}>{w.isPublished ? 'On website' : 'Draft'}</span>
                  <span className="status">
                    {w.availability !== 'available' ? <span className={`dot ${w.availability}`} aria-hidden="true" /> : null}
                    {availabilityLabel(w.availability)}
                  </span>
                  {w.isHero ? <span>Home hero</span> : null}
                  {w.interest ? <span>{w.interest} interested</span> : null}
                </span>
              </Link>
              {reorder ? <span /> : (
                <span className="acts">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-pressed={w.featured}
                    aria-label={w.featured ? `Remove ${w.title} from Selected works` : `Add ${w.title} to Selected works`}
                    title="Selected works on Home"
                    onClick={() => quick(w, { featured: !w.featured }, w.featured ? 'Removed from Selected works' : 'Added to Selected works')}
                  >
                    {w.featured ? '★' : '☆'}
                  </button>
                  <button type="button" className="icon-btn" aria-label={`More actions for ${w.title}`} onClick={() => { setMenu(w); setConfirmDelete(false) }}>⋯</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {menu ? (
        <>
          <div className="sheet-scrim is-open" onClick={() => setMenu(null)} aria-hidden="true" />
          <div className="menu-sheet" role="dialog" aria-modal="true" aria-label={`Actions for ${menu.title}`}>
            <h2>{menu.title}</h2>
            {confirmDelete ? (
              <>
                <p className="muted" style={{ margin: '0 0 8px' }}>Delete this work? It leaves the website and Studio. Your developer can restore it.</p>
                <button type="button" className="danger" onClick={() => remove(menu)}>Delete {menu.title}</button>
                <button type="button" onClick={() => setConfirmDelete(false)}>Keep it</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => router.push(`/admin/works/${menu.id}`)}>Edit</button>
                {menu.isPublished ? (
                  <button type="button" onClick={() => quick(menu, { isPublished: false }, `${menu.title} is off the website`)}>Take off website</button>
                ) : (
                  <button type="button" onClick={() => quick(menu, { isPublished: true }, `${menu.title} is on the website`)}>Put on website</button>
                )}
                {statusAction(menu, 'available', 'Mark as available')}
                {statusAction(menu, 'reserved', 'Mark as reserved')}
                {statusAction(menu, 'sold', 'Mark as sold')}
                {!menu.isHero && menu.availability !== 'upcoming' ? (
                  <button type="button" onClick={() => quick(menu, { isHero: true }, `${menu.title} now opens the Home page`)}>Show first on Home</button>
                ) : null}
                <button type="button" onClick={() => window.open(`/preview/${menu.id}`, '_blank')}>Preview</button>
                <button type="button" onClick={() => router.push(`/admin/works/new?from=${menu.id}`)}>Duplicate</button>
                <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
                <button type="button" onClick={() => setMenu(null)}>Close</button>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
