import Link from 'next/link'
import type { Settings } from '@/lib/types'
import { CopyrightYear } from './CopyrightYear'

export function Footer({ settings }: { settings: Settings }) {
  const { contact, artistName } = settings
  const wa = contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}` : ''
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="stack" style={{ gap: 8 }}>
          <span className="wordmark">{artistName}</span>
          <p className="muted">Studio in Hyderabad. Visits by appointment.</p>
        </div>
        <ul>
          {contact.email ? <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li> : null}
          {wa ? <li><a href={wa} target="_blank" rel="noopener">WhatsApp</a></li> : null}
          {contact.instagram ? <li><a href={contact.instagram} target="_blank" rel="noopener">Instagram</a></li> : null}
        </ul>
        <ul>
          <li><Link href="/works">Works</Link></li>
          <li><Link href="/prints">Prints</Link></li>
          <li><Link href="/privacy">Privacy</Link></li>
          <li className="muted">© <CopyrightYear /> {artistName}</li>
        </ul>
      </div>
    </footer>
  )
}
