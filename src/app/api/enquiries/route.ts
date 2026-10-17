import { after } from 'next/server'
import { assertSameOrigin, clientIp, handle, HttpError } from '@/lib/auth'
import { EnquiryRejected, saveEnquiry, sendEnquiryMails } from '@/lib/enquiries'
import { env } from '@/lib/env'
import { checkFormToken, countLinks, takeRate } from '@/lib/spam'
import { enquirySchema, fieldErrors } from '@/lib/validation'

const HOUR = 3600_000
// Development runs many test enquiries from one address; production keeps the real limits.
const SCALE = process.env.NODE_ENV === 'production' ? 1 : 20

/**
 * A visitor's enquiry. Order: checks, save, answer, then email (after the answer is sent).
 * Bots that fill the hidden field or send in under 3 seconds get a normal-looking answer and nothing is saved.
 */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req)
  const parsed = enquirySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    throw new HttpError(400, 'Some fields need attention.', { fieldErrors: fieldErrors(parsed.error) })
  }
  const input = parsed.data
  const fake = Response.json({ ok: true, ref: '' })

  if (input.website) return fake
  const token = checkFormToken(input.token, env.formSecret())
  if (token === 'too-fast') return fake
  if (token !== 'ok') throw new HttpError(400, 'This form has expired. Reload the page and send it again.')

  const ip = clientIp(req)
  if (!takeRate(`enq-ip:${ip}`, 5 * SCALE, HOUR) || !takeRate(`enq-email:${input.email.toLowerCase()}`, 20 * SCALE, 24 * HOUR)) {
    throw new HttpError(429, 'You have sent several messages in a short time. Wait an hour, or write on Instagram.')
  }
  if (countLinks(input.message) > 2) {
    throw new HttpError(400, 'Remove some links from the message (two at most).', {
      fieldErrors: { message: 'Use two links at most.' },
    })
  }

  let saved
  try {
    saved = await saveEnquiry(input)
  } catch (err) {
    if (err instanceof EnquiryRejected) throw new HttpError(err.status, err.message)
    throw err
  }
  after(() => sendEnquiryMails(saved))
  return Response.json({ ok: true, ref: saved.ref }, { status: 201 })
})
