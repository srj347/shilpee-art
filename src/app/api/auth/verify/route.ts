import { cookies } from 'next/headers'
import { dbConnect } from '@/lib/db'
import { env } from '@/lib/env'
import { LoginTokenModel } from '@/lib/models'
import { createSessionValue, hashToken, SESSION_COOKIE, SESSION_DAYS } from '@/lib/session'

/** Opens from the email link: uses the token once, sets the session cookie, goes to Studio. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const fail = Response.redirect(`${env.siteUrl}/admin/sign-in?error=link`, 303)
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(token)) return fail
  await dbConnect()
  const doc = (await LoginTokenModel.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  ).lean()) as { email: string } | null
  if (!doc || !env.adminEmails().includes(doc.email)) return fail
  const jar = await cookies()
  jar.set(SESSION_COOKIE, createSessionValue(doc.email, env.sessionSecret()), {
    httpOnly: true,
    secure: env.siteUrl.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  })
  return Response.redirect(`${env.siteUrl}/admin`, 303)
}
