import { cookies } from 'next/headers'
import { assertSameOrigin, handle } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/session'

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req)
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  return Response.json({ ok: true })
})
