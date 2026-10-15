import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { env } from './env'
import { readSessionValue, SESSION_COOKIE } from './session'

/** The signed-in Studio user's email, or null. Reads cookies, so it runs at request time. */
export async function getAdminEmail(): Promise<string | null> {
  await connection() // the expiry check reads the clock, so this always runs per request
  const jar = await cookies()
  return readSessionValue(jar.get(SESSION_COOKIE)?.value, env.sessionSecret(), env.adminEmails())
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message)
  }
}

export async function requireAdmin(): Promise<string> {
  const email = await getAdminEmail()
  if (!email) throw new HttpError(401, 'Sign in to Studio to do this.')
  return email
}

/** Wraps a route handler: turns HttpError into a JSON response, logs anything else. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message, ...err.extra }, { status: err.status })
      }
      console.error(err)
      return Response.json({ error: 'Something went wrong on the server. Try again in a minute.' }, { status: 500 })
    }
  }
}

/** Rejects cross-site POSTs to admin and auth endpoints (cookies are SameSite=Lax as well). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (!origin) return
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (new URL(origin).host !== host) throw new HttpError(403, 'This request came from another site.')
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local'
}
