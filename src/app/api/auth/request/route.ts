import { z } from 'zod'
import { assertSameOrigin, clientIp, handle, HttpError } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import { env } from '@/lib/env'
import { sendMail } from '@/lib/mail'
import { signInMail } from '@/lib/mail-templates'
import { LoginTokenModel } from '@/lib/models'
import { LOGIN_TOKEN_MINUTES, newLoginToken } from '@/lib/session'
import { takeRate } from '@/lib/spam'

/** Sends a one-time sign-in link. The answer is the same whether or not the email may sign in. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req)
  const parsed = z.object({ email: z.email() }).safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) throw new HttpError(400, 'Enter an email address, like name@example.com.')
  const email = parsed.data.email.trim().toLowerCase()
  if (!takeRate(`login-ip:${clientIp(req)}`, 10, 3600_000) || !takeRate(`login:${email}`, 5, 3600_000)) {
    throw new HttpError(429, 'Too many sign-in links. Wait an hour, then try again.')
  }
  if (env.adminEmails().includes(email)) {
    await dbConnect()
    const { token, hash } = newLoginToken()
    await LoginTokenModel.create({ email, tokenHash: hash, expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60_000) })
    await sendMail(signInMail(email, `${env.siteUrl}/api/auth/verify?token=${token}`, LOGIN_TOKEN_MINUTES))
  }
  return Response.json({ ok: true })
})
