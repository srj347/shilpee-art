'use client'

import { useEffect, useRef, useState } from 'react'
import { imageUrl, variantSizes } from '@/lib/media'
import type { ArtImage, ImageRole } from '@/lib/types'
import { ApiError, uploadImage } from './api'

const ROLES: { value: ImageRole; label: string }[] = [
  { value: 'main', label: 'Main' },
  { value: 'view', label: 'Other view' },
  { value: 'detail', label: 'Close-up' },
  { value: 'room', label: 'In a room' },
  { value: 'wip', label: 'In progress' },
]
const roleLabel = (r: ImageRole) => ROLES.find((x) => x.value === r)?.label ?? r

type Pending = { key: string; name: string; preview: string; progress: number; error?: string }

/**
 * Photos: pick several from the phone, they upload one after another with progress.
 * Tap a photo to set what it shows, its description, or to move or remove it.
 */
export function PhotoManager({
  images,
  onChange,
  defaultRole,
  onPaper,
}: {
  images: ArtImage[]
  onChange: (next: ArtImage[] | ((prev: ArtImage[]) => ArtImage[])) => void
  defaultRole: ImageRole
  onPaper: boolean
}) {
  const [pending, setPending] = useState<Pending[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const queue = useRef(Promise.resolve())
  const latest = useRef(images)
  useEffect(() => {
    latest.current = images
  }, [images])

  function addFiles(files: FileList | null) {
    if (!files?.length) return
    const items = Array.from(files).map((f) => ({ file: f, key: `${f.name}-${f.size}-${Math.random()}` }))
    setPending((p) => [...p, ...items.map(({ file, key }) => ({ key, name: file.name, preview: URL.createObjectURL(file), progress: 0 }))])
    for (const { file, key } of items) {
      queue.current = queue.current.then(async () => {
        try {
          const hasMain = latest.current.some((i) => i.role === 'main')
          const role: ImageRole = !hasMain && defaultRole !== 'wip' ? 'main' : defaultRole
          const image = (await uploadImage(file, role, (p) =>
            setPending((ps) => ps.map((x) => (x.key === key ? { ...x, progress: p } : x))),
          )) as ArtImage
          const added = { ...image, onMount: onPaper && (role === 'main' || role === 'view') }
          latest.current = [...latest.current, added]
          onChange((prev) => [...prev, added])
          setPending((ps) => {
            const done = ps.find((x) => x.key === key)
            if (done) URL.revokeObjectURL(done.preview)
            return ps.filter((x) => x.key !== key)
          })
        } catch (e) {
          setPending((ps) => ps.map((x) => (x.key === key ? { ...x, error: (e as ApiError).message } : x)))
        }
      })
    }
    if (input.current) input.current.value = ''
  }

  const update = (id: string, patch: Partial<ArtImage>) => {
    onChange((prev) =>
      prev.map((i) => {
        if (i.id === id) return { ...i, ...patch }
        // Only one main photo.
        if (patch.role === 'main' && i.role === 'main') return { ...i, role: 'view' }
        return i
      }),
    )
  }
  const move = (id: string, dir: -1 | 1) =>
    onChange((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const remove = (id: string) => {
    onChange((prev) => prev.filter((i) => i.id !== id))
    setSelected(null)
  }

  const current = images.find((i) => i.id === selected)

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="photos">
        {images.map((img) => {
          const v = variantSizes(img.width, img.height)[0]
          return (
            <button
              key={img.id}
              type="button"
              className="photo"
              aria-pressed={selected === img.id}
              aria-label={`${roleLabel(img.role)} photo. Tap to edit.`}
              onClick={() => setSelected(selected === img.id ? null : img.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(img.id, v.size, 'webp')} alt="" style={{ background: img.dominant }} />
              <span className="role">{roleLabel(img.role)}</span>
            </button>
          )
        })}
        {pending.map((p) => (
          <div key={p.key} className="photo" aria-live="polite">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" style={{ opacity: 0.6 }} />
            {p.error ? (
              <span className="err">
                {p.error}
                <button type="button" className="textlink" style={{ fontSize: 11 }} onClick={() => setPending((ps) => ps.filter((x) => x.key !== p.key))}>
                  Dismiss
                </button>
              </span>
            ) : (
              <>
                <span className="role">{p.progress >= 1 ? 'Preparing…' : `${Math.round(p.progress * 100)}%`}</span>
                <span className="bar" style={{ transform: `scaleX(${p.progress})` }} />
              </>
            )}
          </div>
        ))}
        <button type="button" className="photo add" onClick={() => input.current?.click()}>
          <span><b>+</b>Add photos</span>
        </button>
      </div>
      {/* JPEG/PNG only: iPhones then convert HEIC photos to JPEG while uploading. */}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      <p className="hint">Use daylight, no flash. Take one straight-on photo, one close-up in side light, and one in a room. Up to 30 MB each.</p>

      {current ? (
        <div className="photo-panel">
          <fieldset className="option-group">
            <legend className="eyebrow">This photo shows</legend>
            <div className="options">
              {ROLES.map((r) => (
                <button key={r.value} type="button" className="chip" aria-pressed={current.role === r.value} onClick={() => update(current.id, { role: r.value })}>
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="ph-alt">Description for screen readers</label>
            <input id="ph-alt" value={current.alt} placeholder="Colours and marks, e.g. wide bands of slate grey with a thin bright line" onChange={(e) => update(current.id, { alt: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ph-cap">Caption (optional)</label>
            <input id="ph-cap" value={current.caption ?? ''} placeholder="e.g. Detail, lower left" onChange={(e) => update(current.id, { caption: e.target.value })} />
          </div>
          <label className="toggle">
            <span>Show on grey mount <span className="hint">(for works on white paper)</span></span>
            <input type="checkbox" checked={current.onMount} onChange={(e) => update(current.id, { onMount: e.target.checked })} />
          </label>
          <label className="toggle">
            <span>Digital mock-up <span className="hint">(labelled “Digital preview”)</span></span>
            <input type="checkbox" checked={current.isDigitalPreview} onChange={(e) => update(current.id, { isDigitalPreview: e.target.checked })} />
          </label>
          <div className="link-row">
            <button type="button" className="textlink" onClick={() => move(current.id, -1)}>Move earlier</button>
            <button type="button" className="textlink" onClick={() => move(current.id, 1)}>Move later</button>
            <button type="button" className="textlink" style={{ color: 'var(--red-dot)' }} onClick={() => remove(current.id)}>Remove photo</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
