import type { Metadata } from 'next'
import { getSettings } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How this website uses the details you send.',
  alternates: { canonical: '/privacy' },
}

export default async function PrivacyPage() {
  const s = await getSettings()
  const first = s.artistName.split(' ')[0]
  return (
    <div className="page">
      <section className="container narrow">
        <div className="stack-lg">
          <h1 className="h1">Privacy</h1>
          <div className="prose">
            <p>When you send an enquiry or a message, this website keeps your name, email address, phone number (if you give it), your message and the page you wrote from. {first} uses these details only to reply to you about your enquiry.</p>
            <p>Your details are not sold, shared for marketing, or added to a mailing list. They are stored on servers in India (Mumbai) and kept for up to 24 months after your last message, then deleted.</p>
            <p>The site counts visits without cookies and without identifying you.</p>
            <p>To see, correct or delete what we hold about you, write to {s.contact.email || 'the studio'}. This notice follows India’s Digital Personal Data Protection Act, 2023.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
