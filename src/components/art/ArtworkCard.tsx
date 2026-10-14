import Link from 'next/link'
import { ViewTransition } from 'react'
import { mainImage } from '@/lib/selectors'
import type { Artwork } from '@/lib/types'
import { ArtImage } from './ArtImage'
import { WallLabel } from './WallLabel'

/** The work's image, named so it can grow into the detail page image. */
export function WorkMedia({
  work,
  sizes,
  priority,
  morph = true,
}: {
  work: Artwork
  sizes: string
  priority?: boolean
  /** Only one element per page may carry a work's transition name. */
  morph?: boolean
}) {
  const img = mainImage(work)
  if (!img) return null
  const media = <ArtImage image={img} sizes={sizes} priority={priority} showPreviewTag={false} />
  if (!morph) return <div className={`card-media${img.onMount ? ' on-mount' : ''}`}>{media}</div>
  return (
    <ViewTransition name={`work-${work.id}`} share="morph" default="none">
      <div className={`card-media${img.onMount ? ' on-mount' : ''}`}>{media}</div>
    </ViewTransition>
  )
}

export function ArtworkCard({
  work,
  sizes,
  priority,
  showPrintPrice,
  hrefSuffix = '',
  morph = true,
}: {
  work: Artwork
  sizes: string
  priority?: boolean
  showPrintPrice?: boolean
  hrefSuffix?: string
  morph?: boolean
}) {
  return (
    <Link href={`/works/${work.slug}${hrefSuffix}`} className="card" transitionTypes={['nav-forward']}>
      <WorkMedia work={work} sizes={sizes} priority={priority} morph={morph} />
      <WallLabel work={work} showPrintPrice={showPrintPrice} />
    </Link>
  )
}
