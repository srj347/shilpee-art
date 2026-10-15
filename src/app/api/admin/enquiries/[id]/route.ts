import { z } from 'zod'
import { assertSameOrigin, handle, HttpError, requireAdmin } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import { EnquiryModel } from '@/lib/models'
import { toEnquiry } from '@/lib/serialize'

type Ctx = RouteContext<'/api/admin/enquiries/[id]'>

async function find(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(404, 'This enquiry does not exist.')
  await dbConnect()
  const doc = await EnquiryModel.findById(id).lean()
  if (!doc) throw new HttpError(404, 'This enquiry does not exist.')
  return doc
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin()
  const { id } = await ctx.params
  return Response.json({ enquiry: toEnquiry(await find(id)) })
})

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req)
  await requireAdmin()
  const { id } = await ctx.params
  await find(id)
  const parsed = z
    .object({ status: z.enum(['new', 'replied', 'closed', 'spam']).optional(), artistNote: z.string().max(2000).optional() })
    .strict()
    .safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw new HttpError(400, 'This change is not allowed.')
  const doc = await EnquiryModel.findByIdAndUpdate(id, { $set: parsed.data }, { returnDocument: 'after' }).lean()
  return Response.json({ enquiry: toEnquiry(doc) })
})
