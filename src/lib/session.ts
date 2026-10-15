// Signed session cookie for Studio. No database lookup per request:
// the cookie holds the email and expiry, signed with SESSION_SECRET.
// Rotating SESSION_SECRET signs everyone out.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'sm_session'
export const SESSION_DAYS = 30
export const LOGIN_TOKEN_MINUTES = 15

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`session:${payload}`).digest('base64url')
}

export function createSessionValue(email: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ e: email, x: now + SESSION_DAYS * 864e5 })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

/** Returns the email when the value is genuine, not expired and still on the allow list. */
export function readSessionValue(value: string | undefined, secret: string, allowed: string[], now = Date.now()): string | null {
  if (!value) return null
  const [payload, sig] = value.split('.')
  if (!payload || !sig) return null
  const expected = Buffer.from(sign(payload, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { e: string; x: number }
    if (typeof e !== 'string' || typeof x !== 'number' || x < now) return null
    return allowed.includes(e.toLowerCase()) ? e.toLowerCase() : null
  } catch {
    return null
  }
}

export function newLoginToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
