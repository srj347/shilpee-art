import { z } from 'zod'
import { assertSameOrigin, handle, HttpError, requireAdmin } from '@/lib/auth'
import { reorderArtworks } from '@/lib/studio'

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req)
  await requireAdmin()
  const parsed = z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)).max(2000) }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw new HttpError(400, 'The new order could not be read.')
  await reorderArtworks(parsed.data.ids)
  return Response.json({ ok: true })
})
