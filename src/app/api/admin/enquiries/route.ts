import { handle, requireAdmin } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import { EnquiryModel } from '@/lib/models'
import { toEnquiry } from '@/lib/serialize'

/** Inbox: newest first. ?status=new|replied|closed|spam, default everything except spam. */
export const GET = handle(async (req: Request) => {
  await requireAdmin()
  await dbConnect()
  const status = new URL(req.url).searchParams.get('status')
  const filter = status && ['new', 'replied', 'closed', 'spam'].includes(status) ? { status } : { status: { $ne: 'spam' } }
  const [docs, newCount] = await Promise.all([
    EnquiryModel.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
    EnquiryModel.countDocuments({ status: 'new' }),
  ])
  return Response.json({ enquiries: docs.map(toEnquiry), newCount })
})
