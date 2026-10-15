import { assertSameOrigin, handle, HttpError, requireAdmin } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import { EnquiryModel } from '@/lib/models'
import { toEnquiry } from '@/lib/serialize'
import { deleteArtwork, getArtworkForStudio, quickUpdate, updateArtwork } from '@/lib/studio'
import { artworkSchema, fieldErrors, quickSchema } from '@/lib/validation'

type Ctx = RouteContext<'/api/admin/artworks/[id]'>

/** The work, plus the people who registered interest in it. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin()
  const { id } = await ctx.params
  const artwork = await getArtworkForStudio(id)
  await dbConnect()
  const interested = (
    await EnquiryModel.find({ 'artwork.id': id, type: 'upcoming', status: { $ne: 'spam' } }).sort({ createdAt: -1 }).lean()
  ).map(toEnquiry)
  return Response.json({ artwork, interested })
})

/** Full save from the editor. */
export const PUT = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req)
  await requireAdmin()
  const { id } = await ctx.params
  const parsed = artworkSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    throw new HttpError(400, 'Some fields need attention.', { fieldErrors: fieldErrors(parsed.error) })
  }
  return Response.json({ artwork: await updateArtwork(id, parsed.data) })
})

/** Quick actions: status, on/off website, featured, hero. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req)
  await requireAdmin()
  const { id } = await ctx.params
  const parsed = quickSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw new HttpError(400, 'This change is not allowed.')
  return Response.json({ artwork: await quickUpdate(id, parsed.data) })
})

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req)
  await requireAdmin()
  const { id } = await ctx.params
  await deleteArtwork(id)
  return Response.json({ ok: true })
})
