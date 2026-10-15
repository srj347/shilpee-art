import type { MetadataRoute } from 'next'
import { getPublishedArtworks } from '@/lib/data'
import { fallbackSrc } from '@/lib/media'
import { absolute } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const works = await getPublishedArtworks()
  const latest = works.reduce((m, w) => (w.updatedAt > m ? w.updatedAt : m), '1970-01-01T00:00:00.000Z')
  const pages = ['/', '/works', '/upcoming', '/prints', '/about', '/contact'].map((p) => ({
    url: absolute(p),
    lastModified: latest,
  }))
  return [
    ...pages,
    ...works.map((w) => ({
      url: absolute(`/works/${w.slug}`),
      lastModified: w.updatedAt,
      images: w.images.filter((i) => !i.isDigitalPreview).map((i) => absolute(fallbackSrc(i))),
    })),
  ]
}
