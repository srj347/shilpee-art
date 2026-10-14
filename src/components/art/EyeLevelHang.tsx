import Link from 'next/link'
import type { CSSProperties } from 'react'
import { hangRows } from '@/lib/selectors'
import type { Artwork } from '@/lib/types'
import { WorkMedia } from './ArtworkCard'
import { WallLabel } from './WallLabel'

const GAP = 4 // percent of the row, matches .hang-row column-gap
const MAX_HEIGHT = 40 // tallest work, as a percent of the row width

/**
 * Hangs works the way a gallery hangs a wall: every work keeps its real size
 * relative to the others (one centimetre scale for all rows), centres on one line.
 */
export function EyeLevelHang({ works, perRow = 3 }: { works: Artwork[]; perRow?: number }) {
  const rows = hangRows(works, perRow)
  const fits = rows.map((r) => (100 - GAP * (r.length - 1)) / r.reduce((s, w) => s + w.widthCm, 0))
  const tallest = Math.max(...works.map((w) => w.heightCm))
  const k = Math.min(...fits, MAX_HEIGHT / tallest) // percent of row width per centimetre

  return (
    <div className="hang">
      {rows.map((row, r) => (
        <div
          key={r}
          className="hang-row reveal"
          style={{ '--cols': row.map((w) => `${(w.widthCm * k).toFixed(3)}%`).join(' ') } as CSSProperties}
        >
          {row.map((w, i) => (
            <div key={w.id} className="hang-item" style={{ '--col': i + 1 } as CSSProperties}>
              <Link href={`/works/${w.slug}`} className="card-media-link" transitionTypes={['nav-forward']} tabIndex={-1} aria-hidden="true">
                <WorkMedia work={w} sizes="(max-width: 899px) 100vw, 40vw" />
              </Link>
              <Link href={`/works/${w.slug}`} className="label-link" transitionTypes={['nav-forward']}>
                <WallLabel work={w} />
              </Link>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
