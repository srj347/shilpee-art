import { assertSameOrigin, handle, HttpError, requireAdmin } from '@/lib/auth'
import { createArtwork, listArtworks } from '@/lib/studio'
import { artworkSchema, fieldErrors } from '@/lib/validation'

export const GET = handle(async () => {
  await requireAdmin()
  return Response.json({ artworks: await listArtworks() })
})

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req)
  await requireAdmin()
  const parsed = artworkSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    throw new HttpError(400, 'Some fields need attention.', { fieldErrors: fieldErrors(parsed.error) })
  }
  return Response.json({ artwork: await createArtwork(parsed.data) }, { status: 201 })
})
