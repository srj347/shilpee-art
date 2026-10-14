import type { Metadata } from 'next'
import { JustifiedRows } from '@/components/art/JustifiedRows'
import { getPublishedArtworks, getSettings } from '@/lib/data'
import { printWorks } from '@/lib/selectors'

export const metadata: Metadata = {
  title: 'Prints',
  description: 'Archival pigment prints of selected paintings by Shilpee Maitra, on cotton paper or canvas. Made to order and signed.',
  alternates: { canonical: '/prints' },
}

export default async function PrintsPage() {
  const [all, settings] = await Promise.all([getPublishedArtworks(), getSettings()])
  const works = printWorks(all)
  const first = settings.artistName.split(' ')[0]
  const days = settings.defaults.printLeadTimeDays

  return (
    <div className="page">
      <section className="container">
        <div className="stack-lg">
          <div className="page-head">
            <h1 className="h1">Prints</h1>
            <p className="prose">
              Archival pigment prints of selected paintings, on cotton paper or canvas. Made to order in Hyderabad and signed by {first}.
            </p>
          </div>
          <div className="facts-row">
            <div className="stack" style={{ gap: 4 }}>
              <h2 className="h3">Cotton paper</h2>
              <p className="muted">Matte, archival cotton rag. Ships rolled in a tube, or framed on request.</p>
            </div>
            <div className="stack" style={{ gap: 4 }}>
              <h2 className="h3">Canvas</h2>
              <p className="muted">Printed on cotton canvas and stretched, ready to hang.</p>
            </div>
            <div className="stack" style={{ gap: 4 }}>
              <h2 className="h3">Signed, with a certificate</h2>
              <p className="muted">Limited editions are numbered. Each print has a certificate.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container" aria-label="Works with prints">
        {works.length ? (
          <JustifiedRows works={works} showPrintPrice hrefSuffix="#prints" priorityCount={2} />
        ) : (
          <p className="muted">Prints are coming soon.</p>
        )}
      </section>

      <section className="container narrow reveal" aria-labelledby="faq-title">
        <div className="stack-lg faq">
          <h2 id="faq-title" className="h2">Questions</h2>
          <div className="details-list">
            <details>
              <summary>Which sizes are there?</summary>
              <div className="body"><p>Each work lists its own sizes. If you need a size that is not listed, ask; most works can be printed larger or smaller.</p></div>
            </details>
            <details>
              <summary>Can I get a print framed?</summary>
              <div className="body"><p>Yes. Ask in your enquiry and {first} will suggest a frame and send the price.</p></div>
            </details>
            <details>
              <summary>How long does a print take?</summary>
              <div className="body"><p>Prints are made to order and take about {days} days, plus delivery.</p></div>
            </details>
            <details>
              <summary>What is the difference between open and limited editions?</summary>
              <div className="body"><p>An open edition can be printed again. A limited edition stops at a fixed number, and each print carries its number, for example 7/25.</p></div>
            </details>
          </div>
        </div>
      </section>
    </div>
  )
}
