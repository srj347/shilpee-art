'use client'

import { useEffect, useState } from 'react'
import { imageUrl, variantSizes } from '@/lib/media'
import type { ArtImage, Settings } from '@/lib/types'
import { api, ApiError, uploadImage } from './api'
import { useStudio } from './StudioShell'

function F({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
      {error ? <span className="error">{error}</span> : null}
    </div>
  )
}

function Thumb({ img }: { img: ArtImage }) {
  const v = variantSizes(img.width, img.height)[0]
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl(img.id, v.size, 'webp')} alt="" style={{ width: 96, height: 96, objectFit: 'cover', background: img.dominant }} />
}

/** About text, contact details and defaults used on every work page. */
export function SettingsForm() {
  const { toast } = useStudio()
  const [s, setS] = useState<Settings | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    api<{ settings: Settings }>('/api/admin/settings')
      .then((d) => setS(d.settings))
      .catch((e: ApiError) => setFormError(e.message))
  }, [])

  if (!s) return <div className="studio-main">{formError ? <p className="error-box">{formError}</p> : <p className="muted">Loading…</p>}</div>

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v })
  const setContact = (k: keyof Settings['contact'], v: string) => setS({ ...s, contact: { ...s.contact, [k]: v } })
  const setDefault = (k: keyof Settings['defaults'], v: string | number) => setS({ ...s, defaults: { ...s.defaults, [k]: v } })

  async function upload(file: File | undefined, target: 'portrait' | 'studio') {
    if (!file) return
    setUploading(target)
    try {
      const img = (await uploadImage(file, 'view', () => {})) as ArtImage
      setS((cur) => (cur ? (target === 'portrait' ? { ...cur, portrait: img } : { ...cur, studioImages: [...cur.studioImages, img].slice(0, 6) }) : cur))
    } catch (e) {
      toast((e as ApiError).message)
    } finally {
      setUploading('')
    }
  }

  async function save() {
    if (!s) return
    setBusy(true)
    setFormError('')
    try {
      const res = await api<{ settings: Settings }>('/api/admin/settings', { method: 'PUT', json: s })
      setS(res.settings)
      setErrors({})
      toast('Settings saved. The website shows them now.')
    } catch (e) {
      const err = e as ApiError
      setErrors(err.fieldErrors ?? {})
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio-main">
      <div className="studio-head"><h1>Settings</h1></div>
      <form className="ed" onSubmit={(e) => { e.preventDefault(); save() }} noValidate>
        <section className="ed-section">
          <h2>About you</h2>
          <F id="s-name" label="Name on the website" error={errors.artistName}>
            <input id="s-name" value={s.artistName} onChange={(e) => set('artistName', e.target.value)} />
          </F>
          <F id="s-statement" label="One sentence for the Home page" error={errors.statement}>
            <textarea id="s-statement" rows={2} value={s.statement} onChange={(e) => set('statement', e.target.value)} />
          </F>
          <F id="s-about" label="About page" hint="Write in the first person. Leave an empty line between paragraphs." error={errors.about}>
            <textarea id="s-about" rows={10} value={s.about} onChange={(e) => set('about', e.target.value)} />
          </F>
          <div className="option-group">
            <span className="eyebrow">Portrait</span>
            <div className="link-row">
              {s.portrait ? <Thumb img={s.portrait} /> : null}
              <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                {uploading === 'portrait' ? 'Uploading…' : s.portrait ? 'Replace portrait' : 'Add a portrait'}
                <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0], 'portrait')} />
              </label>
            </div>
          </div>
          <div className="option-group">
            <span className="eyebrow">How I work (up to 3 studio photos)</span>
            <div className="link-row">
              {s.studioImages.map((img, i) => (
                <span key={img.id} className="stack" style={{ gap: 6 }}>
                  <Thumb img={img} />
                  <input aria-label={`Caption for studio photo ${i + 1}`} placeholder="Caption" value={img.caption ?? ''} style={{ width: 96, fontSize: 12, border: 0, borderBottom: '1px solid var(--graphite)', background: 'transparent' }} onChange={(e) => set('studioImages', s.studioImages.map((x) => (x.id === img.id ? { ...x, caption: e.target.value } : x)))} />
                  <button type="button" className="textlink" style={{ fontSize: 12 }} onClick={() => set('studioImages', s.studioImages.filter((x) => x.id !== img.id))}>Remove</button>
                </span>
              ))}
              {s.studioImages.length < 3 ? (
                <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                  {uploading === 'studio' ? 'Uploading…' : 'Add a studio photo'}
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0], 'studio')} />
                </label>
              ) : null}
            </div>
          </div>
          <div className="option-group">
            <span className="eyebrow">Exhibitions and collections</span>
            {s.cv.map((c, i) => (
              <div key={i} className="grid2" style={{ gridTemplateColumns: '5rem 1fr auto', alignItems: 'end' }}>
                <F id={`cv-y-${i}`} label="Year"><input id={`cv-y-${i}`} value={c.year} onChange={(e) => set('cv', s.cv.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))} /></F>
                <F id={`cv-t-${i}`} label="Entry"><input id={`cv-t-${i}`} value={c.text} onChange={(e) => set('cv', s.cv.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} /></F>
                <button type="button" className="textlink" style={{ fontSize: 13 }} onClick={() => set('cv', s.cv.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className="textlink" style={{ alignSelf: 'flex-start' }} onClick={() => set('cv', [...s.cv, { year: String(new Date().getFullYear()), text: '' }])}>Add an entry</button>
          </div>
        </section>

        <section className="ed-section">
          <h2>Contact</h2>
          <F id="s-email" label="Public email" error={errors.contact}>
            <input id="s-email" type="email" value={s.contact.email} onChange={(e) => setContact('email', e.target.value)} />
          </F>
          <F id="s-wa" label="WhatsApp number, with country code" hint="e.g. 91 98480 12345">
            <input id="s-wa" inputMode="tel" value={s.contact.whatsapp} onChange={(e) => setContact('whatsapp', e.target.value)} />
          </F>
          <F id="s-ig" label="Instagram link">
            <input id="s-ig" inputMode="url" value={s.contact.instagram} placeholder="https://www.instagram.com/…" onChange={(e) => setContact('instagram', e.target.value)} />
          </F>
          <F id="s-promise" label="I reply…" hint="Shown after every enquiry, e.g. “within two working days”">
            <input id="s-promise" value={s.contact.replyPromise} onChange={(e) => setContact('replyPromise', e.target.value)} />
          </F>
          <F id="s-notify" label="Send new enquiries to" hint="One or more emails, separated by commas" error={errors.notifyEmails}>
            <input id="s-notify" value={s.notifyEmails.join(', ')} onChange={(e) => set('notifyEmails', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
          </F>
        </section>

        <section className="ed-section">
          <h2>Defaults for every work</h2>
          <F id="s-cert" label="Certificate of authenticity"><input id="s-cert" value={s.defaults.certificateNote} onChange={(e) => setDefault('certificateNote', e.target.value)} /></F>
          <div className="grid2">
            <F id="s-from" label="Ships from"><input id="s-from" value={s.defaults.shipsFrom} onChange={(e) => setDefault('shipsFrom', e.target.value)} /></F>
            <F id="s-lead" label="Originals ship in (days)"><input id="s-lead" inputMode="numeric" value={s.defaults.leadTimeDays} onChange={(e) => setDefault('leadTimeDays', Number(e.target.value.replace(/\D/g, '')) || 0)} /></F>
          </div>
          <F id="s-pack" label="Packing"><textarea id="s-pack" rows={2} value={s.defaults.packaging} onChange={(e) => setDefault('packaging', e.target.value)} /></F>
          <div className="grid2">
            <F id="s-plead" label="Prints are made in (days)"><input id="s-plead" inputMode="numeric" value={s.defaults.printLeadTimeDays} onChange={(e) => setDefault('printLeadTimeDays', Number(e.target.value.replace(/\D/g, '')) || 0)} /></F>
            <span />
          </div>
          <F id="s-pnote" label="About prints"><textarea id="s-pnote" rows={2} value={s.defaults.printNote} onChange={(e) => setDefault('printNote', e.target.value)} /></F>
          <p className="hint">Print size presets: {s.printPresets.map((p) => `${p.name} (${p.variants.length} sizes)`).join(', ')}. Ask your developer to change them.</p>
        </section>

        {formError ? <p className="error-box" role="alert">{formError}</p> : null}
        <div className="save-bar">
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </div>
  )
}
