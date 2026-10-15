// Studio writes. Every write refreshes the public pages at once (no stale copy is served).
import { revalidateTag } from 'next/cache'
import { HttpError } from './auth'
import { TAG_ARTWORKS, TAG_SETTINGS } from './data'
import { dbConnect } from './db'
import { slugify } from './format'
import { ArtworkModel, EnquiryModel, nextSeq, SettingsModel } from './models'
import { toArtwork, toSettings } from './serialize'
import type { Artwork, Settings } from './types'
import type { ArtworkInput } from './validation'

export function refreshPublic(what: 'artworks' | 'settings' = 'artworks') {
  revalidateTag(what === 'artworks' ? TAG_ARTWORKS : TAG_SETTINGS, { expire: 0 })
}

async function uniqueSlug(wanted: string, exceptId?: string): Promise<string> {
  const base = slugify(wanted) || 'work'
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const clash = await ArtworkModel.exists({ slug: candidate, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })
    if (!clash) return candidate
  }
  throw new HttpError(409, 'Choose a different title or web address.')
}

function normaliseImages(input: ArtworkInput) {
  // Exactly one main image (the first), unless the work is in progress.
  const images = [...input.images]
  if (images.length && !images.some((i) => i.role === 'main') && input.availability !== 'upcoming') {
    images[0] = { ...images[0], role: 'main' }
  }
  let seenMain = false
  return images.map((i) => {
    if (i.role !== 'main') return i
    if (seenMain) return { ...i, role: 'view' as const }
    seenMain = true
    return i
  })
}

export async function listArtworks(): Promise<(Artwork & { interest: number })[]> {
  await dbConnect()
  const [docs, interest] = await Promise.all([
    ArtworkModel.find({ deletedAt: null }).sort({ sortOrder: 1, createdAt: -1 }).lean(),
    EnquiryModel.aggregate<{ _id: string; n: number }>([
      { $match: { type: 'upcoming', status: { $ne: 'spam' } } },
      { $group: { _id: '$artwork.id', n: { $sum: 1 } } },
    ]),
  ])
  const counts = new Map(interest.map((i) => [i._id, i.n]))
  return docs.map((d) => ({ ...toArtwork(d), interest: counts.get(String(d._id)) ?? 0 }))
}

export async function getArtworkForStudio(id: string): Promise<Artwork> {
  await dbConnect()
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(404, 'This work does not exist.')
  const doc = await ArtworkModel.findOne({ _id: id, deletedAt: null }).lean()
  if (!doc) throw new HttpError(404, 'This work does not exist.')
  return toArtwork(doc)
}

export async function createArtwork(input: ArtworkInput): Promise<Artwork> {
  await dbConnect()
  const seq = await nextSeq(`artwork-${input.year}`)
  const first = await ArtworkModel.findOne({ deletedAt: null }).sort({ sortOrder: 1 }).select('sortOrder').lean()
  if (input.isHero) await ArtworkModel.updateMany({ isHero: true }, { $set: { isHero: false } })
  const doc = await ArtworkModel.create({
    ...input,
    images: normaliseImages(input),
    ref: `SM-${input.year}-${String(seq).padStart(3, '0')}`,
    slug: await uniqueSlug(input.slug || input.title),
    // New works go to the top of the list.
    sortOrder: ((first as { sortOrder?: number } | null)?.sortOrder ?? 1) - 1,
    publishedAt: input.isPublished ? new Date() : undefined,
    soldAt: input.availability === 'sold' ? new Date() : undefined,
  })
  refreshPublic()
  return toArtwork(doc.toObject())
}

export async function updateArtwork(id: string, input: ArtworkInput): Promise<Artwork> {
  const current = await getArtworkForStudio(id)
  if (input.isHero && !current.isHero) await ArtworkModel.updateMany({ isHero: true }, { $set: { isHero: false } })
  const slug = input.slug && input.slug !== current.slug ? await uniqueSlug(input.slug, id) : current.slug
  const doc = await ArtworkModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...input,
        images: normaliseImages(input),
        slug,
        publishedAt: input.isPublished ? (current.publishedAt ?? new Date()) : current.publishedAt,
        soldAt: input.availability === 'sold' ? (current.soldAt ?? new Date()) : undefined,
      },
    },
    { returnDocument: 'after' },
  ).lean()
  refreshPublic()
  return toArtwork(doc)
}

export async function quickUpdate(
  id: string,
  patch: Partial<Pick<Artwork, 'availability' | 'isPublished' | 'featured' | 'isHero'>>,
): Promise<Artwork> {
  const current = await getArtworkForStudio(id)
  if (patch.isPublished && !current.images.length) {
    throw new HttpError(400, 'Add at least one photo before you put the work on the website.')
  }
  if (patch.isHero) await ArtworkModel.updateMany({ isHero: true }, { $set: { isHero: false } })
  const set: Record<string, unknown> = { ...patch }
  if (patch.isPublished && !current.publishedAt) set.publishedAt = new Date()
  if (patch.availability === 'sold' && !current.soldAt) set.soldAt = new Date()
  if (patch.availability && patch.availability !== 'sold') set.soldAt = undefined
  const doc = await ArtworkModel.findByIdAndUpdate(id, { $set: set }, { returnDocument: 'after' }).lean()
  refreshPublic()
  return toArtwork(doc)
}

/** Hidden, not erased: the document stays in the database with deletedAt set. */
export async function deleteArtwork(id: string): Promise<void> {
  await getArtworkForStudio(id)
  await ArtworkModel.updateOne({ _id: id }, { $set: { deletedAt: new Date(), isPublished: false, isHero: false } })
  refreshPublic()
}

export async function reorderArtworks(ids: string[]): Promise<void> {
  await dbConnect()
  await ArtworkModel.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i } } } })))
  refreshPublic()
}

export async function getSettingsForStudio(): Promise<Settings> {
  await dbConnect()
  return toSettings(await SettingsModel.findOne({ key: 'site' }).lean())
}

export async function saveSettings(data: Settings): Promise<Settings> {
  await dbConnect()
  const doc = await SettingsModel.findOneAndUpdate(
    { key: 'site' },
    { $set: { data } },
    { upsert: true, returnDocument: 'after' },
  ).lean()
  refreshPublic('settings')
  return toSettings(doc)
}
