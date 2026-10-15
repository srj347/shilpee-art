import type { Metadata } from 'next'
import { ContactForm } from '@/components/enquiry/ContactForm'
import { CopyButton } from '@/components/site/CopyButton'
import { getSettings } from '@/lib/data'
import { formatPhone } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Write to Shilpee Maitra about a painting, a print, a commission or a studio visit.',
  alternates: { canonical: '/contact' },
}

export default async function ContactPage() {
  const s = await getSettings()
  const first = s.artistName.split(' ')[0]
  const wa = s.contact.whatsapp.replace(/\D/g, '')
  return (
    <div className="page">
      <section className="container">
        <div className="contact-grid">
          <div className="stack-lg">
            <div className="page-head">
              <h1 className="h1">Contact</h1>
              <p className="prose">I reply to every message {s.contact.replyPromise}.</p>
            </div>
            <ul className="direct">
              {s.contact.email ? (
                <li>
                  <span className="k">Email</span>
                  <a href={`mailto:${s.contact.email}`}>{s.contact.email}</a>
                  <CopyButton text={s.contact.email} />
                </li>
              ) : null}
              {wa ? (
                <li>
                  <span className="k">WhatsApp</span>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener">{formatPhone(wa)}</a>
                </li>
              ) : null}
              {s.contact.instagram ? (
                <li>
                  <span className="k">Instagram</span>
                  <a href={s.contact.instagram} target="_blank" rel="noopener">{s.contact.instagram.replace(/^https?:\/\/(www\.)?/, '')}</a>
                </li>
              ) : null}
              <li>
                <span className="k">Studio</span>
                <span>Hyderabad, India. Visits by appointment.</span>
              </li>
            </ul>
          </div>
          <div className="stack-lg">
            <h2 className="h2">Send a message</h2>
            <ContactForm artistFirstName={first} replyPromise={s.contact.replyPromise} />
          </div>
        </div>
      </section>
    </div>
  )
}
