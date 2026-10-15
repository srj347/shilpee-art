// Plain, readable emails. Every value from a visitor is escaped.
import { formatPhone } from './format'
import type { Mail } from './mail'

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fbfbf9;color:#151515;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">${body}</div></body></html>`
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:6px 16px 6px 0;vertical-align:top;color:#5f5f5b;font-size:11px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap">${k}</td><td style="padding:6px 0">${v}</td></tr>`

export function signInMail(to: string, link: string, minutes: number): Mail {
  return {
    to: [to],
    subject: 'Your sign-in link for Studio',
    text: `Use this link to sign in to Studio. It works once and expires in ${minutes} minutes.\n\n${link}\n\nIf you did not ask for it, you can ignore this email.`,
    html: layout(`<p>Use this link to sign in to Studio. It works once and expires in ${minutes} minutes.</p>
<p style="margin:28px 0"><a href="${esc(link)}" style="background:#151515;color:#fbfbf9;padding:14px 22px;text-decoration:none;display:inline-block">Sign in to Studio</a></p>
<p style="color:#5f5f5b;font-size:13px">If you did not ask for it, you can ignore this email.</p>`),
  }
}

export interface EnquiryMailData {
  ref: string
  createdAt: Date
  type: string
  name: string
  email: string
  phone?: string
  message: string
  pageUrl: string
  source?: string
  work?: { title: string; year: number; ref: string; medium: string; size: string; status: string; priceShown?: string }
  print?: { label: string; price: string }
  studioUrl: string
  artistName: string
  artistWhatsapp?: string
  replyPromise: string
}

const TYPE_LABEL: Record<string, string> = {
  original: 'original',
  print: 'print',
  commission: 'commission',
  upcoming: 'register interest',
  general: 'message',
}

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${full}`
}

export function enquiryToArtist(d: EnquiryMailData): Mail {
  const what = d.work ? `${d.work.title} (${TYPE_LABEL[d.type] ?? d.type})` : TYPE_LABEL[d.type] ?? d.type
  const when = d.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
  const workLines = d.work
    ? [`${d.work.title}, ${d.work.year} · ${d.work.ref}`, d.print ? `Print · ${d.print.label} · ${d.print.price}` : `${d.work.status}${d.work.priceShown ? ` · ${d.work.priceShown}` : ''}`, `${d.work.medium} · ${d.work.size}`]
    : []
  const text = [
    `New enquiry ${d.ref} · ${when}`,
    '',
    ...(workLines.length ? ['WORK', ...workLines, ''] : []),
    'FROM',
    d.name,
    d.email,
    ...(d.phone ? [`${d.phone} · WhatsApp: ${waLink(d.phone)}`] : []),
    '',
    'MESSAGE',
    d.message || '(no message)',
    '',
    `Came from: ${d.source || 'direct'} · ${d.pageUrl}`,
    '',
    `Reply to this email to answer ${d.name.split(' ')[0]} directly.`,
    `Open in Studio: ${d.studioUrl}`,
  ].join('\n')

  const html = layout(`<p style="color:#5f5f5b;font-size:13px;margin:0 0 16px">${esc(d.ref)} · ${esc(when)}</p>
<table style="border-collapse:collapse;width:100%">
${d.work ? row('Work', `<em style="font-family:Georgia,serif;font-size:17px">${esc(d.work.title)}</em>, ${d.work.year} · ${esc(d.work.ref)}<br>${esc(workLines[1])}<br>${esc(workLines[2])}`) : row('Type', esc(TYPE_LABEL[d.type] ?? d.type))}
${row('From', `${esc(d.name)}<br><a href="mailto:${esc(d.email)}">${esc(d.email)}</a>${d.phone ? `<br>${esc(d.phone)} · <a href="${waLink(d.phone)}">Message on WhatsApp</a>` : ''}`)}
${row('Source', `${esc(d.source || 'direct')} · <a href="${esc(d.pageUrl)}">${esc(d.pageUrl.replace(/^https?:\/\//, ''))}</a>`)}
</table>
<blockquote style="margin:20px 0;padding-left:14px;border-left:2px solid #dededa;font-family:Georgia,serif;font-size:16px;white-space:pre-wrap">${esc(d.message || '(no message)')}</blockquote>
<p>Reply to this email to answer ${esc(d.name.split(' ')[0])} directly.</p>
<p><a href="${esc(d.studioUrl)}" style="color:#151515">Open in Studio</a></p>`)

  return { to: [], subject: `New enquiry · ${what} · ${d.name}`, text, html, replyTo: d.email }
}

export function enquiryToVisitor(d: EnquiryMailData): Mail {
  const first = d.name.split(' ')[0]
  const artistFirst = d.artistName.split(' ')[0]
  const about = d.work ? `about ${d.work.title}` : ''
  const subject = d.work ? `Thank you for asking about ${d.work.title}` : `Thank you for your message`
  const summary = d.work
    ? `${d.work.title}, ${d.work.year} · ${d.print ? `Print · ${d.print.label}` : TYPE_LABEL[d.type] === 'original' ? 'Original' : d.work.status} · ${d.work.size}`
    : ''
  const wa = d.artistWhatsapp ? formatPhone(d.artistWhatsapp) : ''
  const text = [
    `Dear ${first},`,
    '',
    `Thank you for writing to me${about ? ` ${about}` : ''}. I read every message myself, and I will reply ${d.replyPromise}, usually sooner.`,
    '',
    'This is what you sent:',
    ...(summary ? [summary] : []),
    `"${d.message}"`,
    '',
    ...(wa ? [`If it is easier to talk, you can message me on WhatsApp at ${wa}.`, ''] : []),
    'Warmly,',
    artistFirst,
    '',
    `${d.artistName} · Studio in Hyderabad, India`,
    `Your reference: ${d.ref}. You get this email because you sent a message on my website. You are not on any mailing list.`,
  ].join('\n')

  const html = layout(`<p>Dear ${esc(first)},</p>
<p>Thank you for writing to me${d.work ? ` about <em style="font-family:Georgia,serif">${esc(d.work.title)}</em>` : ''}. I read every message myself, and I will reply ${esc(d.replyPromise)}, usually sooner.</p>
<p>This is what you sent:</p>
<blockquote style="margin:0 0 20px;padding-left:14px;border-left:2px solid #dededa;font-family:Georgia,serif;white-space:pre-wrap">${summary ? `${esc(summary)}<br>` : ''}“${esc(d.message)}”</blockquote>
${wa ? `<p>If it is easier to talk, you can message me on WhatsApp at ${esc(wa)}.</p>` : ''}
<p>Warmly,</p>
<p style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 24px">${esc(artistFirst)}</p>
<p style="color:#5f5f5b;font-size:12px;border-top:1px solid #dededa;padding-top:12px">${esc(d.artistName)} · Studio in Hyderabad, India<br>Your reference: ${esc(d.ref)}. You get this email because you sent a message on my website. You are not on any mailing list.</p>`)

  return { to: [d.email], subject, text, html }
}
