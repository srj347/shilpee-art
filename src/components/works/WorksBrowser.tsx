'use client'

import { useSearchParams } from 'next/navigation'
import { startTransition, useState, ViewTransition } from 'react'
import { useLocalFlag } from '@/lib/use-client-store'
import { JustifiedRows } from '@/components/art/JustifiedRows'
import type { SizeTier } from '@/lib/format'
import { filterWorks, type WorkFilter } from '@/lib/selectors'
import type { Artwork, MediumTag } from '@/lib/types'

const MEDIA: { value?: MediumTag; label: string }[] = [
  { label: 'All' },
  { value: 'acrylic', label: 'Acrylic' },
  { value: 'watercolour', label: 'Watercolour' },
  { value: 'mixed-media', label: 'Mixed media' },
]
const SIZES: { value: SizeTier; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export function parseFilter(p: URLSearchParams | null): WorkFilter {
  const medium = p?.get('medium') as MediumTag | null
  const size = p?.get('size') as SizeTier | null
  return {
    medium: medium && MEDIA.some((m) => m.value === medium) ? medium : undefined,
    size: size && SIZES.some((s) => s.value === size) ? size : undefined,
    includeSold: p?.get('show') === 'all',
  }
}

function toQuery(f: WorkFilter): string {
  const q = new URLSearchParams()
  if (f.medium) q.set('medium', f.medium)
  if (f.size) q.set('size', f.size)
  if (f.includeSold) q.set('show', 'all')
  const s = q.toString()
  return s ? `?${s}` : ''
}

function describe(f: WorkFilter): string {
  const size = f.size ? `${f.size} ` : ''
  const medium = f.medium ? MEDIA.find((m) => m.value === f.medium)!.label.toLowerCase() + 's' : 'works'
  return `${size}${medium}`.replace(/^./, (c) => c.toUpperCase())
}

/** Filter chips and the grid. Filtering happens in the browser, instantly; the URL keeps the filter for sharing. */
export function WorksBrowser({ works }: { works: Artwork[] }) {
  const params = useSearchParams()
  const [filter, setFilter] = useState<WorkFilter>(() => parseFilter(params))
  const [dense, setDense] = useLocalFlag('sm.dense')

  const update = (next: WorkFilter) => {
    startTransition(() => setFilter(next))
    window.history.replaceState(null, '', `${window.location.pathname}${toQuery(next)}`)
  }
  const toggleDense = (d: boolean) => startTransition(() => setDense(d))

  const shown = filterWorks(works, filter)
  const availableCount = filterWorks(works, {}).filter((w) => w.availability === 'available').length

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="h1">Works</h1>
        <p className="meta">{availableCount} available</p>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        <div className="filters" role="group" aria-label="Filter works">
          {MEDIA.map((m) => (
            <button key={m.label} type="button" className="chip" aria-pressed={filter.medium === m.value} onClick={() => update({ ...filter, medium: m.value })}>
              {m.label}
            </button>
          ))}
          <span className="filter-sep" aria-hidden="true" />
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              className="chip"
              aria-pressed={filter.size === s.value}
              title={s.value === 'small' ? 'Up to 50 cm' : s.value === 'medium' ? '51 to 100 cm' : 'Over 100 cm'}
              onClick={() => update({ ...filter, size: filter.size === s.value ? undefined : s.value })}
            >
              {s.label}
            </button>
          ))}
          <span className="filter-sep" aria-hidden="true" />
          <button type="button" className="chip" aria-pressed={!!filter.includeSold} onClick={() => update({ ...filter, includeSold: !filter.includeSold })}>
            Include sold
          </button>
        </div>
        <div className="toolbar">
          <span className="meta" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'work' : 'works'}
          </span>
          <span className="view-toggle" role="group" aria-label="Layout">
            <button type="button" className="chip" aria-pressed={!dense} onClick={() => toggleDense(false)}>Full</button>
            <button type="button" className="chip" aria-pressed={dense} onClick={() => toggleDense(true)}>Grid</button>
          </span>
        </div>
      </div>
      <ViewTransition key={toQuery(filter) + dense} enter="fade-in" exit="fade-out" default="none">
        <div>
          {shown.length ? (
            <JustifiedRows works={shown} dense={dense} priorityCount={2} />
          ) : (
            <div className="empty">
              <p className="statement" style={{ fontSize: 24 }}>No {describe(filter).toLowerCase()} are available now.</p>
              <p className="muted">
                <button type="button" className="textlink" onClick={() => update({ ...filter, includeSold: true })}>See sold works</button>, or ask about a commission.
              </p>
            </div>
          )}
        </div>
      </ViewTransition>
    </div>
  )
}
