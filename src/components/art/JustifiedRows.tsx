import type { CSSProperties } from 'react'
import { mainImage } from '@/lib/selectors'
import type { Artwork } from '@/lib/types'
import { ArtworkCard } from './ArtworkCard'

/** Equal-height rows at natural widths. Phones show one work per row (or two when dense). */
export function JustifiedRows({
  works,
  dense = false,
  showPrintPrice = false,
  hrefSuffix,
  priorityCount = 0,
  morph = true,
}: {
  works: Artwork[]
  dense?: boolean
  showPrintPrice?: boolean
  hrefSuffix?: string
  priorityCount?: number
  /** False for a placeholder grid that another grid with the same works replaces. */
  morph?: boolean
}) {
  return (
    <div className={`jrows${dense ? ' is-dense' : ''}`}>
      {works.map((w, i) => {
        const img = mainImage(w)
        const ar = img ? img.width / img.height : w.widthCm / w.heightCm
        return (
          <div key={w.id} className="jrow-item" style={{ '--ar': ar.toFixed(4) } as CSSProperties}>
            <ArtworkCard
              work={w}
              sizes={dense ? '(max-width: 599px) 50vw, 40vw' : '(max-width: 599px) 100vw, 50vw'}
              priority={i < priorityCount}
              showPrintPrice={showPrintPrice}
              hrefSuffix={hrefSuffix}
              morph={morph}
            />
          </div>
        )
      })}
    </div>
  )
}
