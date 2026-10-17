import Link from 'next/link'
import { JustifiedRows } from '@/components/art/JustifiedRows'
import { StatusLine } from '@/components/art/WallLabel'
import { sizeCm, sizeIn } from '@/lib/format'
import { mainImage } from '@/lib/selectors'
import { artworkJsonLd, jsonLdScript } from '@/lib/seo'
import type { Artwork, Settings } from '@/lib/types'
import { BuyPanel } from './BuyPanel'
import { CloserStrip, GalleryProvider, GalleryStrip } from './Gallery'
import { ScaleView } from './ScaleView'
import { StickyEnquire } from './StickyEnquire'

function presentationText(w: Artwork): string {
  switch (w.original.presentation) {
    case 'stretched':
      return `Stretched on a wooden frame${w.depthCm ? `, ${w.depthCm} cm deep` : ''}.`
    case 'framed':
      return w.original.frameNote ? `${w.original.frameNote}.` : 'Framed.'
    case 'rolled':
      return 'Unstretched canvas, ships rolled in a tube. Stretching or framing on request.'
    case 'unframed-paper':
      return 'Unframed, on paper. Framing on request; frame behind UV-filtering glass.'
  }
}

export function ArtworkDetail({ work, settings, related }: { work: Artwork; settings: Settings; related: Artwork[] }) {
  const main = mainImage(work)
  const lead = work.shipping.leadTimeDays ?? settings.defaults.leadTimeDays
  const onPaper = work.support === 'paper'

  return (
    <GalleryProvider images={work.images}>
      <div data-work-root>
        <div className="container">
          <article className="detail">
            <div className="detail-media">
              <GalleryStrip workId={work.id} title={work.title} />
            </div>

            <div className="detail-info">
              <Link href={work.availability === 'upcoming' ? '/upcoming' : '/works'} className="back-link muted" transitionTypes={['nav-back']}>
                ← {work.availability === 'upcoming' ? 'Upcoming' : 'Works'}
              </Link>
              <div className="detail-label">
                <h1 className="work-title">{work.title}</h1>
                <p className="meta">{work.year} · {work.medium}</p>
                <p className="meta">
                  {sizeCm(work.heightCm, work.widthCm, work.depthCm)} ({sizeIn(work.heightCm, work.widthCm)}) · {work.ref}
                </p>
                <div style={{ marginTop: 8 }}>
                  <StatusLine work={work} always />
                </div>
              </div>

              {/* BuyPanel runs in the browser: keep the WhatsApp number out of the page. */}
              <BuyPanel work={work} settings={{ ...settings, contact: { ...settings.contact, whatsapp: '' } }} />

              {work.availability === 'upcoming' && work.upcoming.studioNote ? (
                <div className="stack">
                  <h2 className="eyebrow">From the studio</h2>
                  <div className="prose"><p>{work.upcoming.studioNote}</p></div>
                </div>
              ) : null}

              {work.story ? (
                <div className="stack">
                  <h2 className="eyebrow">The story</h2>
                  <div className="prose">
                    {work.story.split(/\n{2,}/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              <ScaleView heightCm={work.heightCm} widthCm={work.widthCm} colour={main?.dominant ?? '#6E7C80'} />

              <div className="details-list">
                <details>
                  <summary>Materials</summary>
                  <div className="body">
                    <p>{work.medium}.</p>
                    <p>{presentationText(work)}</p>
                  </div>
                </details>
                <details>
                  <summary>Certificate of authenticity</summary>
                  <div className="body">
                    <p>
                      {work.certificate.included
                        ? work.certificate.note || settings.defaults.certificateNote
                        : 'Ask for details about provenance.'}
                    </p>
                    <p>Reference number: {work.ref}</p>
                  </div>
                </details>
                <details>
                  <summary>Shipping and packing</summary>
                  <div className="body">
                    <p>Ships from {settings.defaults.shipsFrom} in about {lead} days, insured and tracked.</p>
                    <p>{work.shipping.packaging || settings.defaults.packaging}</p>
                    <p>{work.shipping.international === false ? 'Ships within India only.' : 'Shipping outside India on request.'}</p>
                  </div>
                </details>
                <details>
                  <summary>Care</summary>
                  <div className="body">
                    <p>Hang away from direct sun and damp walls. Dust gently with a soft, dry brush.</p>
                    {onPaper ? <p>Works on paper last longest behind UV-filtering glass.</p> : null}
                    <p>Colours may vary slightly between screens.</p>
                  </div>
                </details>
              </div>
            </div>
          </article>
        </div>

        <div className="page" style={{ paddingTop: 'var(--section-gap)' }}>
          {work.images.some((i) => i.role === 'detail') ? (
            <section className="container stack reveal" aria-labelledby="closer-title">
              <h2 id="closer-title" className="eyebrow">Closer</h2>
              <CloserStrip />
            </section>
          ) : null}
          {related.length ? (
            <section className="container reveal" aria-labelledby="related-title">
              <div className="section-head">
                <h2 id="related-title" className="h2">Other works</h2>
                <Link href="/works" className="textlink arrow">All works</Link>
              </div>
              <JustifiedRows works={related} />
            </section>
          ) : null}
        </div>

        <StickyEnquire work={work} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(artworkJsonLd(work, settings)) }} />
    </GalleryProvider>
  )
}
