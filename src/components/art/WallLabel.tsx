import { availabilityLabel, formatInr, printsFrom, sizeCm } from '@/lib/format'
import type { Artwork } from '@/lib/types'

export function StatusLine({ work, always = false }: { work: Pick<Artwork, 'availability' | 'upcoming'>; always?: boolean }) {
  // Available is the normal state, so cards show no mark for it.
  if (work.availability === 'available' && !always) return null
  return (
    <span className="status">
      {work.availability !== 'available' ? <span className={`dot ${work.availability}`} aria-hidden="true" /> : null}
      {availabilityLabel(work.availability, work.upcoming.expectedMonth)}
    </span>
  )
}

/** Gallery wall label: italic title and year, medium, size, then status or print price. */
export function WallLabel({ work, showPrintPrice = false }: { work: Artwork; showPrintPrice?: boolean }) {
  const from = showPrintPrice ? printsFrom(work) : undefined
  return (
    <div className="label">
      <span className="t">
        {work.title}, <span className="y">{work.year}</span>
      </span>
      <span className="m">{work.medium}</span>
      <span className="m">{sizeCm(work.heightCm, work.widthCm)}</span>
      {from !== undefined ? <span className="m">Prints from {formatInr(from)}</span> : null}
      <StatusLine work={work} />
    </div>
  )
}
