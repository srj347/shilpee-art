// Enquiries: save first, then email. A failed email is retried by /api/cron/mail-retry.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSettings } from './data'
import { dbConnect } from './db'
import { env } from './env'
import { availabilityLabel, formatInr, priceLabel, sizeCm } from './format'
import { sendMail } from './mail'
import { enquiryToArtist, enquiryToVisitor, type EnquiryMailData } from './mail-templates'
import { ArtworkModel, EnquiryModel, nextSeq } from './models'
import { mainImage } from './selectors'
import { toArtwork } from './serialize'
import type { Settings } from './types'
import type { z } from 'zod'
import type { enquirySchema } from './validation'

type Input = z.infer<typeof enquirySchema>

export class EnquiryRejected extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Checks the artwork and print choice against the database, then saves. Returns the saved document. */
export async function saveEnquiry(input: Input): Promise<any> {
  await dbConnect()
  let artwork: any
  let print: any
  if (input.artworkId) {
    const doc = await ArtworkModel.findOne({ _id: input.artworkId, isPublished: true, deletedAt: null }).lean()
    if (!doc) throw new EnquiryRejected(400, 'This work is no longer on the website. Write to us from the Contact page.')
    const w = toArtwork(doc)
    artwork = {
      id: w.id,
      ref: w.ref,
      title: w.title,
      slug: w.slug,
      availability: w.availability,
      priceShown: w.availability === 'upcoming' ? undefined : priceLabel(w.original.price),
      thumbId: mainImage(w)?.id,
    }
    if (input.type === 'print') {
      const v = w.prints.enabled ? w.prints.variants.find((x) => x.id === input.variantId && x.active) : undefined
      if (!v) throw new EnquiryRejected(400, 'This print size is no longer offered. Choose another size.')
      print = { variantId: v.id, label: v.label, priceInr: v.priceInr }
      artwork.priceShown = formatInr(v.priceInr)
    }
  } else if (input.type === 'original' || input.type === 'print' || input.type === 'upcoming') {
    throw new EnquiryRejected(400, 'Choose a work first.')
  }

  const year = new Date().getFullYear()
  const seq = await nextSeq(`enquiry-${year}`)
  const doc = await EnquiryModel.create({
    ref: `E-${year}-${String(seq).padStart(4, '0')}`,
    type: input.type,
    artwork,
    print,
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    message: input.message,
    pageUrl: input.pageUrl,
    referrer: input.referrer,
    utmSource: input.utmSource,
  })
  return doc.toObject()
}

async function mailData(e: any, settings: Settings): Promise<EnquiryMailData> {
  let work: EnquiryMailData['work']
  if (e.artwork?.id) {
    const doc = await ArtworkModel.findById(e.artwork.id).lean()
    const w = doc ? toArtwork(doc) : undefined
    work = {
      title: e.artwork.title,
      year: w?.year ?? new Date(e.createdAt).getFullYear(),
      ref: e.artwork.ref,
      medium: w?.medium ?? '',
      size: w ? sizeCm(w.heightCm, w.widthCm) : '',
      status: availabilityLabel(e.artwork.availability),
      priceShown: e.artwork.priceShown,
    }
  }
  const source = e.utmSource || (e.referrer ? safeHost(e.referrer) : undefined)
  return {
    ref: e.ref,
    createdAt: new Date(e.createdAt),
    type: e.type,
    name: e.name,
    email: e.email,
    phone: e.phone,
    message: e.message,
    pageUrl: e.pageUrl,
    source,
    work,
    print: e.print?.variantId ? { label: e.print.label, price: formatInr(e.print.priceInr) } : undefined,
    studioUrl: `${env.siteUrl}/admin/enquiries/${e._id}`,
    artistName: settings.artistName,
    artistInstagram: settings.contact.instagram,
    replyPromise: settings.contact.replyPromise,
  }
}

function safeHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

/** Sends whichever of the two emails has not gone yet, and records the result. */
export async function sendEnquiryMails(e: any): Promise<void> {
  await dbConnect()
  const settings = await getSettings()
  const data = await mailData(e, settings)
  const recipients = settings.notifyEmails.length ? settings.notifyEmails : env.adminEmails()
  const next = { ...e.mail }
  const errors: string[] = []

  if (next.toArtist !== 'sent') {
    try {
      await sendMail({ ...enquiryToArtist(data), to: recipients })
      next.toArtist = 'sent'
    } catch (err) {
      next.toArtist = 'failed'
      errors.push(`artist: ${String(err).slice(0, 200)}`)
    }
  }
  if (next.toVisitor !== 'sent') {
    try {
      // A reply to the thank-you email reaches the artist, not the no-inbox sending address.
      await sendMail({ ...enquiryToVisitor(data), replyTo: settings.contact.email || recipients[0] })
      next.toVisitor = 'sent'
    } catch (err) {
      next.toVisitor = 'failed'
      errors.push(`visitor: ${String(err).slice(0, 200)}`)
    }
  }
  await EnquiryModel.updateOne(
    { _id: e._id },
    {
      $set: {
        'mail.toArtist': next.toArtist,
        'mail.toVisitor': next.toVisitor,
        ...(errors.length ? { 'mail.lastError': errors.join(' | ') } : {}),
      },
      ...(errors.length ? {} : { $unset: { 'mail.lastError': 1 } }),
      $inc: { 'mail.attempts': 1 },
    },
  )
  if (errors.length) console.error(`[enquiry ${e.ref}] email failed: ${errors.join(' | ')}`)
}

/** Retries emails that failed or never went (for example after a restart). */
export async function retryPendingMails(): Promise<{ tried: number }> {
  await dbConnect()
  const due = await EnquiryModel.find({
    status: { $ne: 'spam' },
    'mail.attempts': { $lt: 5 },
    createdAt: { $lt: new Date(Date.now() - 2 * 60_000) },
    $or: [{ 'mail.toArtist': { $ne: 'sent' } }, { 'mail.toVisitor': { $ne: 'sent' } }],
  })
    .limit(20)
    .lean()
  for (const e of due) await sendEnquiryMails(e)
  return { tried: due.length }
}
