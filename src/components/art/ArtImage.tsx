'use client'

import { useEffect, useRef } from 'react'
import { fallbackSrc, srcSet } from '@/lib/media'
import type { ArtImage as Img } from '@/lib/types'

type Props = {
  image: Img
  sizes: string
  alt?: string
  priority?: boolean
  className?: string
  /** Show "Digital preview" on mock-up images. */
  showPreviewTag?: boolean
}

/**
 * A work of art as an image: real aspect ratio reserved, dominant colour and a
 * blurred preview while loading, AVIF/WebP sources, and a short fade-in.
 */
export function ArtImage({ image, sizes, alt, priority, className, showPreviewTag = true }: Props) {
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && el.complete && el.naturalWidth > 0) el.dataset.loaded = ''
  }, [])

  return (
    <div
      className={`art-img${className ? ` ${className}` : ''}`}
      style={{
        aspectRatio: `${image.width} / ${image.height}`,
        backgroundColor: image.dominant,
        backgroundImage: image.lqip ? `url("${image.lqip}")` : undefined,
      }}
    >
      <picture>
        <source type="image/avif" srcSet={srcSet(image, 'avif')} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet(image, 'webp')} sizes={sizes} />
        <img
          ref={ref}
          src={fallbackSrc(image)}
          alt={alt ?? image.alt}
          width={image.width}
          height={image.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          draggable={false}
          onLoad={(e) => {
            e.currentTarget.dataset.loaded = ''
          }}
        />
      </picture>
      {showPreviewTag && image.isDigitalPreview ? <span className="preview-tag">Digital preview</span> : null}
    </div>
  )
}
