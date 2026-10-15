import { timingSafeEqual } from 'node:crypto'
import { handle, HttpError } from '@/lib/auth'
import { retryPendingMails } from '@/lib/enquiries'
import { env } from '@/lib/env'

/** Called by cron on the server every 10 minutes: Authorization: Bearer <CRON_SECRET>. */
export const POST = handle(async (req: Request) => {
  const secret = env.cronSecret()
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret))
  if (!ok) throw new HttpError(401, 'Not allowed.')
  return Response.json(await retryPendingMails())
})
