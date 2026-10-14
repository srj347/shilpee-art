import type { Metadata } from 'next'
import Link from 'next/link'
import { ArtImage } from '@/components/art/ArtImage'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { getSettings } from '@/lib/data'
import { jsonLdScript, absolute } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About',
  description: 'Shilpee Maitra paints large abstract works in acrylic and watercolour in her studio in Hyderabad.',
  alternates: { canonical: '/about' },
}

export default async function AboutPage() {
  const s = await getSettings()
  const paragraphs = s.about.split(/\n{2,}/).filter(Boolean)
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: s.artistName,
    jobTitle: 'Artist',
    url: absolute('/about'),
    address: { '@type': 'PostalAddress', addressLocality: 'Hyderabad', addressCountry: 'IN' },
    ...(s.contact.instagram ? { sameAs: [s.contact.instagram] } : {}),
  }

  return (
    <div className="page">
      <section className="container">
        <div className="split" style={{ alignItems: 'start' }}>
          {s.portrait ? (
            <figure style={{ margin: 0 }} className="stack">
              <ArtImage image={s.portrait} sizes="(max-width: 899px) 100vw, 45vw" priority />
              <figcaption className="meta">In the studio, Hyderabad</figcaption>
            </figure>
          ) : null}
          <div className="stack-lg">
            <h1 className="h1">{s.artistName}</h1>
            <div className="prose">
              {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>{s.statement}</p>}
            </div>
          </div>
        </div>
      </section>

      {s.studioImages.length ? (
        <section className="container reveal" aria-labelledby="process-title">
          <h2 id="process-title" className="eyebrow" style={{ marginBottom: 24 }}>How I work</h2>
          <div className="three">
            {s.studioImages.slice(0, 3).map((img) => (
              <figure key={img.id} style={{ margin: 0 }} className="stack">
                <ArtImage image={img} sizes="(max-width: 599px) 100vw, 33vw" />
                {img.caption ? <figcaption className="meta">{img.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {s.cv.length ? (
        <section className="container reveal" aria-labelledby="cv-title">
          <h2 id="cv-title" className="eyebrow" style={{ marginBottom: 16 }}>Exhibitions and collections</h2>
          <ul className="cv">
            {s.cv.map((c, i) => (
              <li key={i}><span className="muted">{c.year}</span><span>{c.text}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="container reveal">
        <div className="contact-line">
          <p className="statement" style={{ maxWidth: '24ch' }}>Commissions and studio visits by appointment.</p>
          <div className="link-row">
            <EnquireButton request={{ type: 'commission' }}>Commission a work</EnquireButton>
            <Link href="/contact" className="textlink">Visit the studio</Link>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(person) }} />
    </div>
  )
}
