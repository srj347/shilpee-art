'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { cmToIn, formatInr, mediumTagLabel, slugify } from '@/lib/format'
import type { Artwork, Availability, Enquiry, Settings } from '@/lib/types'
import { api, ApiError } from './api'
import { emptyDraft, mediumTagsFor, newVariantId, supportFor, toDraft, toInput, variantToDraft, type Draft, type VariantDraft } from './draft'
import { PhotoManager } from './PhotoManager'
import { useStudio } from './StudioShell'

const LOCAL_KEY = 'sm.studio.new-work'
const noopSubscribe = () => () => {}
function readLocal(): string | null {
  try {
    return localStorage.getItem(LOCAL_KEY)
  } catch {
    return null
  }
}
const STATUSES: { value: Availability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'upcoming', label: 'Upcoming' },
]
const MEDIUM_SUGGESTIONS = [
  'Acrylic on canvas',
  'Acrylic and watercolour on canvas',
  'Watercolour on cotton paper',
  'Mixed media on canvas',
  'Ink and watercolour on paper',
]

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
      {error ? <span className="error" id={`${id}-err`}>{error}</span> : null}
    </div>
  )
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle">
      <span>
        {label}
        {hint ? <span className="hint"> {hint}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export function WorkEditor({ id, fromId, onCreated }: { id?: string; fromId?: string; onCreated?: () => void }) {
  const router = useRouter()
  const { toast } = useStudio()
  const [draft, setDraft] = useState<Draft | null>(() => (id || fromId ? null : emptyDraft(new Date().getFullYear())))
  const [saved, setSaved] = useState<Artwork | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [interested, setInterested] = useState<Enquiry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  // An unsaved new work kept on this phone, offered back once.
  const savedRaw = useSyncExternalStore(
    noopSubscribe,
    () => (id || fromId ? null : readLocal()),
    () => null,
  )
  const [restoreDismissed, setRestoreDismissed] = useState(false)
  const restorable = useMemo<Draft | null>(() => {
    if (!savedRaw || restoreDismissed) return null
    try {
      return JSON.parse(savedRaw) as Draft
    } catch {
      return null
    }
  }, [savedRaw, restoreDismissed])
  const [supportTouched, setSupportTouched] = useState(false)
  const loaded = useRef(false)

  // Load the work (or the one to duplicate) and the settings.
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    api<{ settings: Settings }>('/api/admin/settings').then((d) => setSettings(d.settings)).catch(() => {})
    if (id) {
      api<{ artwork: Artwork; interested: Enquiry[] }>(`/api/admin/artworks/${id}`)
        .then((d) => {
          setSaved(d.artwork)
          setDraft(toDraft(d.artwork))
          setInterested(d.interested)
        })
        .catch((e: ApiError) => setFormError(e.message))
      return
    }
    if (fromId) {
      api<{ artwork: Artwork }>(`/api/admin/artworks/${fromId}`)
        .then((d) => {
          const copy = toDraft(d.artwork)
          setDraft({ ...copy, title: `${copy.title} (copy)`, slug: '', images: [], isPublished: false, availability: 'available', isHero: false, featured: false, story: '', variants: copy.variants.map((v) => ({ ...v, id: newVariantId(), editionsSold: 0 })) })
          setDirty(true)
        })
        .catch((e: ApiError) => setFormError(e.message))
      return
    }
  }, [id, fromId])

  // Keep an unsaved new work on the phone, so a call or a lost signal does not lose it.
  useEffect(() => {
    if (id || !draft || !dirty) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(draft))
      } catch {}
    }, 500)
    return () => clearTimeout(t)
  }, [draft, dirty, id])

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setDirty(true)
    setErrors((e) => (e[key as string] ? { ...e, [key]: '' } : e))
  }, [])
  const setImages = useCallback((next: Draft['images'] | ((p: Draft['images']) => Draft['images'])) => {
    setDraft((d) => (d ? { ...d, images: typeof next === 'function' ? next(d.images) : next } : d))
    setDirty(true)
  }, [])
  const setVariant = (vid: string, patch: Partial<VariantDraft>) =>
    set('variants', draft!.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)))

  async function save(publish: boolean) {
    if (!draft) return
    const local: Record<string, string> = {}
    if (!draft.title.trim()) local.title = 'Add a title.'
    if (!Number(draft.heightCm)) local.heightCm = 'Add the height in cm.'
    if (!Number(draft.widthCm)) local.widthCm = 'Add the width in cm.'
    if (!/^\d{4}$/.test(draft.year)) local.year = 'Use four digits, like 2026.'
    if (publish && !draft.images.length) local.images = 'Add at least one photo before you put the work on the website.'
    setErrors(local)
    if (Object.keys(local).length) {
      setFormError('Some fields need attention.')
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], .field .error')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
      return
    }
    setBusy(true)
    setFormError('')
    try {
      const body = toInput(draft, publish)
      const res = id
        ? await api<{ artwork: Artwork }>(`/api/admin/artworks/${id}`, { method: 'PUT', json: body })
        : await api<{ artwork: Artwork }>('/api/admin/artworks', { method: 'POST', json: body })
      setDirty(false)
      try {
        localStorage.removeItem(LOCAL_KEY)
      } catch {}
      const a = res.artwork
      toast(publish ? `${a.title} is on the website` : `${a.title} saved as a draft`)
      if (!id) {
        onCreated?.()
        router.replace(`/admin/works/${a.id}`)
      } else {
        setSaved(a)
        setDraft(toDraft(a))
      }
    } catch (e) {
      const err = e as ApiError
      setErrors(err.fieldErrors ?? {})
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (formError && !draft) return <div className="studio-main"><p className="error-box">{formError}</p><Link href="/admin" className="textlink">Back to works</Link></div>
  if (!draft) return <div className="studio-main" aria-busy="true"><p className="muted">Loading…</p></div>

  const d = draft
  const tags = mediumTagsFor(d.medium)
  const isUpcoming = d.availability === 'upcoming'
  const isLive = !!saved?.isPublished
  const err = (k: string) => errors[k] || undefined
  const presets = settings?.printPresets ?? []

  return (
    <div className="studio-main">
      <div className="studio-head">
        <Link href="/admin" className="back-link muted">← Works</Link>
        {saved ? <span className={`pill ${saved.isPublished ? 'live' : 'draft'}`}>{saved.isPublished ? 'On website' : 'Draft'} · {saved.ref}</span> : null}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 400, margin: 0 }}>{id ? d.title || 'Untitled' : 'Add work'}</h1>

      {restorable ? (
        <div className="notice">
          <span>You have an unsaved work from earlier: “{restorable.title || 'Untitled'}”.</span>
          <span className="link-row">
            <button type="button" className="textlink" onClick={() => { setDraft(restorable); setRestoreDismissed(true); setDirty(true) }}>Restore it</button>
            <button type="button" className="textlink" onClick={() => { setRestoreDismissed(true); try { localStorage.removeItem(LOCAL_KEY) } catch {} }}>Discard</button>
          </span>
        </div>
      ) : null}

      <form className="ed" onSubmit={(e) => { e.preventDefault(); save(isLive) }} noValidate>
        <section className="ed-section">
          <h2>Photos</h2>
          <PhotoManager images={d.images} onChange={setImages} defaultRole={isUpcoming ? 'wip' : 'view'} onPaper={d.support === 'paper'} />
          {err('images') ? <p className="error-box">{err('images')}</p> : null}
        </section>

        <div className="ed-cols">
          <section className="ed-section">
            <h2>Essentials</h2>
            <Field id="w-title" label="Title" error={err('title')}>
              <input id="w-title" value={d.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!err('title')} autoComplete="off" />
            </Field>
            <div className="grid3">
              <Field id="w-year" label="Year" error={err('year')}>
                <input id="w-year" inputMode="numeric" value={d.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={!!err('year')} />
              </Field>
              <Field id="w-h" label="Height cm" error={err('heightCm')}>
                <input id="w-h" inputMode="decimal" value={d.heightCm} onChange={(e) => set('heightCm', e.target.value.replace(/[^\d.]/g, ''))} aria-invalid={!!err('heightCm')} />
              </Field>
              <Field id="w-w" label="Width cm" error={err('widthCm')}>
                <input id="w-w" inputMode="decimal" value={d.widthCm} onChange={(e) => set('widthCm', e.target.value.replace(/[^\d.]/g, ''))} aria-invalid={!!err('widthCm')} />
              </Field>
            </div>
            {Number(d.heightCm) && Number(d.widthCm) ? (
              <p className="hint">{cmToIn(Number(d.heightCm))} × {cmToIn(Number(d.widthCm))} in, height × width</p>
            ) : null}
            <Field id="w-medium" label="Medium" hint={tags.length ? `Filters: ${tags.map(mediumTagLabel).join(', ')}` : 'Mention acrylic, watercolour, ink or mixed media so the work shows in filters.'}>
              <input
                id="w-medium"
                list="medium-list"
                value={d.medium}
                onChange={(e) => {
                  set('medium', e.target.value)
                  const s = supportFor(e.target.value)
                  if (s && !supportTouched) set('support', s)
                }}
              />
              <datalist id="medium-list">{MEDIUM_SUGGESTIONS.map((m) => <option key={m} value={m} />)}</datalist>
            </Field>
            <fieldset className="option-group">
              <legend className="eyebrow">Painted on</legend>
              <div className="options">
                {(['canvas', 'paper', 'board'] as const).map((s) => (
                  <button key={s} type="button" className="chip" aria-pressed={d.support === s} onClick={() => { set('support', s); setSupportTouched(true) }}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="ed-section">
            <h2>Selling</h2>
            <fieldset className="option-group">
              <legend className="eyebrow">Status</legend>
              <div className="options">
                {STATUSES.map((s) => (
                  <button key={s.value} type="button" className="chip" aria-pressed={d.availability === s.value} onClick={() => set('availability', s.value)}>
                    {s.value !== 'available' ? <span className={`dot ${s.value}`} style={{ marginRight: 8 }} aria-hidden="true" /> : null}
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {isUpcoming ? (
              <>
                <Field id="w-month" label="Expected to finish (month)">
                  <input id="w-month" type="month" value={d.expectedMonth} onChange={(e) => set('expectedMonth', e.target.value)} />
                </Field>
                <Field id="w-note" label="Note from the studio" hint="A few lines about where the work is now. Shown on Upcoming.">
                  <textarea id="w-note" rows={3} value={d.studioNote} onChange={(e) => set('studioNote', e.target.value)} />
                </Field>
              </>
            ) : (
              <>
                <fieldset className="option-group">
                  <legend className="eyebrow">Price</legend>
                  <div className="options">
                    <button type="button" className="chip" aria-pressed={d.priceMode === 'fixed'} onClick={() => set('priceMode', 'fixed')}>Show a price</button>
                    <button type="button" className="chip" aria-pressed={d.priceMode === 'on_request'} onClick={() => set('priceMode', 'on_request')}>Price on request</button>
                  </div>
                </fieldset>
                {d.priceMode === 'fixed' ? (
                  <Field id="w-price" label="Price in ₹" hint={Number(d.priceInr) ? `Shown as ${formatInr(Number(d.priceInr))}` : undefined}>
                    <input id="w-price" inputMode="numeric" value={d.priceInr} onChange={(e) => set('priceInr', e.target.value.replace(/\D/g, ''))} />
                  </Field>
                ) : null}
                <Field id="w-pres" label="How it is sent">
                  <select id="w-pres" value={d.presentation} onChange={(e) => set('presentation', e.target.value as Draft['presentation'])}>
                    <option value="stretched">Stretched canvas</option>
                    <option value="framed">Framed</option>
                    <option value="rolled">Rolled in a tube</option>
                    <option value="unframed-paper">Unframed, on paper</option>
                  </select>
                </Field>
                {d.presentation === 'framed' ? (
                  <Field id="w-frame" label="Frame">
                    <input id="w-frame" value={d.frameNote} placeholder="e.g. Natural oak floater frame" onChange={(e) => set('frameNote', e.target.value)} />
                  </Field>
                ) : null}
              </>
            )}
            <Toggle label="Show in Selected works on Home" checked={d.featured} onChange={(v) => set('featured', v)} />
          </section>
        </div>

        <section className="ed-section">
          <h2>The story</h2>
          <Field id="w-story" label="In your words" hint="50 to 200 words: what started it, how you made it. You can paste your Instagram caption.">
            <textarea id="w-story" rows={6} value={d.story} onChange={(e) => set('story', e.target.value)} />
          </Field>
        </section>

        {!isUpcoming ? (
          <section className="ed-section">
            <h2>Prints</h2>
            <Toggle label="Sell prints of this work" checked={d.printsEnabled} onChange={(v) => set('printsEnabled', v)} />
            {err('prints') ? <p className="error-box">{err('prints')}</p> : null}
            {d.printsEnabled ? (
              <>
                {presets.length ? (
                  <div className="option-group">
                    <span className="eyebrow">Fill in sizes from a preset</span>
                    <div className="options">
                      {presets.map((p) => (
                        <button key={p.name} type="button" className="chip" onClick={() => set('variants', [...d.variants, ...p.variants.map((v) => variantToDraft(v))])}>
                          + {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <fieldset className="option-group">
                  <legend className="eyebrow">Edition</legend>
                  <div className="options">
                    <button type="button" className="chip" aria-pressed={d.edition === 'limited'} onClick={() => set('edition', 'limited')}>Limited, numbered</button>
                    <button type="button" className="chip" aria-pressed={d.edition === 'open'} onClick={() => set('edition', 'open')}>Open</button>
                  </div>
                </fieldset>
                <Toggle label="Signed by me" checked={d.signed} onChange={(v) => set('signed', v)} />
                {d.variants.map((v, i) => (
                  <div key={v.id} className="variant">
                    <div className="top">
                      <strong style={{ fontSize: 14 }}>Size {i + 1}</strong>
                      <button type="button" className="textlink" style={{ fontSize: 13, color: 'var(--red-dot)' }} onClick={() => set('variants', d.variants.filter((x) => x.id !== v.id))}>Remove</button>
                    </div>
                    <Field id={`v-label-${v.id}`} label="Label shown to buyers">
                      <input id={`v-label-${v.id}`} value={v.label} onChange={(e) => setVariant(v.id, { label: e.target.value })} />
                    </Field>
                    <div className="grid3">
                      <Field id={`v-h-${v.id}`} label="Height cm"><input id={`v-h-${v.id}`} inputMode="decimal" value={v.heightCm} onChange={(e) => setVariant(v.id, { heightCm: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
                      <Field id={`v-w-${v.id}`} label="Width cm"><input id={`v-w-${v.id}`} inputMode="decimal" value={v.widthCm} onChange={(e) => setVariant(v.id, { widthCm: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
                      <Field id={`v-p-${v.id}`} label="Price ₹"><input id={`v-p-${v.id}`} inputMode="numeric" value={v.priceInr} onChange={(e) => setVariant(v.id, { priceInr: e.target.value.replace(/\D/g, '') })} /></Field>
                    </div>
                    <div className="grid2">
                      <Field id={`v-m-${v.id}`} label="Material">
                        <select id={`v-m-${v.id}`} value={v.material} onChange={(e) => setVariant(v.id, { material: e.target.value as 'paper' | 'canvas' })}>
                          <option value="paper">Cotton paper</option>
                          <option value="canvas">Canvas</option>
                        </select>
                      </Field>
                      {d.edition === 'limited' ? (
                        <Field id={`v-e-${v.id}`} label="Edition size" hint={v.editionsSold ? `${v.editionsSold} sold` : undefined}>
                          <input id={`v-e-${v.id}`} inputMode="numeric" value={v.editionSize} onChange={(e) => setVariant(v.id, { editionSize: e.target.value.replace(/\D/g, '') })} />
                        </Field>
                      ) : <span />}
                    </div>
                    <Toggle label="Framed" checked={v.framed} onChange={(x) => setVariant(v.id, { framed: x })} />
                    <Toggle label="Offer this size" checked={v.active} onChange={(x) => setVariant(v.id, { active: x })} />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => set('variants', [...d.variants, variantToDraft({ label: '', heightCm: 0, widthCm: 0, material: 'paper', substrate: 'Cotton rag 308 gsm', finish: 'matte', framed: false, priceInr: 0, active: true })])}
                >
                  Add a size
                </button>
              </>
            ) : null}
          </section>
        ) : null}

        {isUpcoming && interested.length ? (
          <section className="ed-section">
            <h2>Registered interest ({interested.length})</h2>
            <p className="hint">Write to these people first when the work is finished.</p>
            <ul className="rows">
              {interested.map((q) => (
                <li key={q.id} className="rowi no-handle" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                  <Link href={`/admin/enquiries/${q.id}`} className="main">
                    <span style={{ fontWeight: 500 }}>{q.name}</span>
                    <span className="sub">{q.email}{q.phone ? ` · ${q.phone}` : ''}</span>
                  </Link>
                  <a className="textlink" style={{ fontSize: 13 }} href={`mailto:${q.email}?subject=${encodeURIComponent(`${d.title} is finished`)}`}>Email</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="ed-section">
          <details>
            <summary>More details</summary>
            <div className="inner">
              <div className="grid2">
                <Field id="w-depth" label="Depth cm"><input id="w-depth" inputMode="decimal" value={d.depthCm} onChange={(e) => set('depthCm', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
                <Field id="w-series" label="Series"><input id="w-series" value={d.series} onChange={(e) => set('series', e.target.value)} /></Field>
              </div>
              <Field id="w-subjects" label="Subjects" hint="Separate with commas, e.g. monsoon, stone"><input id="w-subjects" value={d.subjects} onChange={(e) => set('subjects', e.target.value)} /></Field>
              <Toggle label="Certificate of authenticity included" checked={d.certificateIncluded} onChange={(v) => set('certificateIncluded', v)} />
              <Field id="w-cert" label="Certificate note" hint={`Empty uses: ${settings?.defaults.certificateNote ?? 'the default from Settings'}`}><input id="w-cert" value={d.certificateNote} onChange={(e) => set('certificateNote', e.target.value)} /></Field>
              <div className="grid2">
                <Field id="w-lead" label="Ships in (days)" hint={`Empty uses ${settings?.defaults.leadTimeDays ?? 7}`}><input id="w-lead" inputMode="numeric" value={d.leadTimeDays} onChange={(e) => set('leadTimeDays', e.target.value.replace(/\D/g, ''))} /></Field>
                <Field id="w-intl" label="Ships abroad">
                  <select id="w-intl" value={d.international} onChange={(e) => set('international', e.target.value as Draft['international'])}>
                    <option value="default">On request</option>
                    <option value="yes">Yes</option>
                    <option value="no">India only</option>
                  </select>
                </Field>
              </div>
              <Field id="w-pack" label="Packing note" hint="Empty uses the default from Settings"><input id="w-pack" value={d.packaging} onChange={(e) => set('packaging', e.target.value)} /></Field>
              <Toggle label="Show first on Home (hero)" checked={d.isHero} onChange={(v) => set('isHero', v)} hint="Only one work at a time" />
              <Field id="w-slug" label="Web address" hint={`/works/${d.slug || slugify(d.title) || '…'}`}>
                <input id="w-slug" value={d.slug} placeholder={slugify(d.title)} onChange={(e) => set('slug', slugify(e.target.value))} />
              </Field>
              <Field id="w-seo" label="Search description" hint="Optional. About 150 characters for Google and link previews."><textarea id="w-seo" rows={2} maxLength={200} value={d.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} /></Field>
            </div>
          </details>
        </section>

        {formError ? <p className="error-box" role="alert">{formError}</p> : null}

        <div className="save-bar">
          {isLive ? (
            <>
              <button type="button" className="btn" disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(false)}>Take off website</button>
            </>
          ) : (
            <>
              <button type="button" className="btn" disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : 'Put on website'}</button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(false)}>Save as draft</button>
            </>
          )}
          {saved ? <a className="textlink" href={`/preview/${saved.id}`} target="_blank" rel="noopener">Preview</a> : null}
          <span className="state" aria-live="polite">{dirty ? 'Unsaved changes' : saved ? 'All changes saved' : ''}</span>
        </div>
      </form>
    </div>
  )
}
