// Spam protection without a visible CAPTCHA:
// a signed form token (rejects sends that are too fast or too old), a honeypot field,
// rate limits in memory (one server process), and a limit on links.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const MIN_FILL_MS = 3000
export const MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000

function sign(ts: string, secret: string): string {
  return createHmac('sha256', secret).update(`form:${ts}`).digest('base64url').slice(0, 32)
}

export function issueFormToken(secret: string, now = Date.now()): string {
  const ts = String(now)
  return `${ts}.${sign(ts, secret)}`
}

export type TokenCheck = 'ok' | 'invalid' | 'too-fast' | 'expired'

export function checkFormToken(token: unknown, secret: string, now = Date.now()): TokenCheck {
  if (typeof token !== 'string') return 'invalid'
  const [ts, sig] = token.split('.')
  if (!ts || !sig || !/^\d+$/.test(ts)) return 'invalid'
  const expected = Buffer.from(sign(ts, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'invalid'
  const age = now - Number(ts)
  if (age < MIN_FILL_MS) return 'too-fast'
  if (age > MAX_TOKEN_AGE_MS) return 'expired'
  return 'ok'
}

const buckets = new Map<string, number[]>()

/** Sliding-window limit. Returns false when the key has used up its limit. */
export function takeRate(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k)
  }
  return true
}

export function resetRates() {
  buckets.clear()
}

export function countLinks(text: string): number {
  return (text.match(/https?:\/\/|www\./gi) ?? []).length
}
