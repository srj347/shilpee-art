// Cached reads for the public site. Studio writes call revalidatePublic() in revalidate.ts.
import { cacheLife, cacheTag } from 'next/cache'
import { dbConnect } from './db'
import { ArtworkModel, SettingsModel } from './models'
import { toArtwork, toSettings } from './serialize'
import type { Artwork, Settings } from './types'

export const TAG_ARTWORKS = 'artworks'
export const TAG_SETTINGS = 'settings'

export async function getSettings(): Promise<Settings> {
  'use cache'
  cacheLife('max')
  cacheTag(TAG_SETTINGS)
  await dbConnect()
  const doc = await SettingsModel.findOne({ key: 'site' }).lean()
  return toSettings(doc)
}

/** Every published, not deleted work, in the artist's order. */
export async function getPublishedArtworks(): Promise<Artwork[]> {
  'use cache'
  cacheLife('max')
  cacheTag(TAG_ARTWORKS)
  await dbConnect()
  const docs = await ArtworkModel.find({ isPublished: true, deletedAt: null })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()
  return docs.map(toArtwork)
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | undefined> {
  const all = await getPublishedArtworks()
  return all.find((a) => a.slug === slug)
}
