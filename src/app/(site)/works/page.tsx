import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { JustifiedRows } from '@/components/art/JustifiedRows'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { WorksBrowser } from '@/components/works/WorksBrowser'
import { getPublishedArtworks } from '@/lib/data'
import { filterWorks } from '@/lib/selectors'

export const metadata: Metadata = {
  title: 'Works',
  description: 'Available paintings by Shilpee Maitra: abstract works in acrylic, watercolour and mixed media.',
  alternates: { canonical: '/works' },
}

export default async function WorksPage() {
  const all = await getPublishedArtworks()
  const index = all.filter((w) => w.availability !== 'upcoming')
  const defaultShown = filterWorks(index, {})

  return (
    <div className="page">
      <section className="container">
        {/* The static page shows the unfiltered list; the browser applies any filter in the URL. */}
        <Suspense
          fallback={
            <div className="stack-lg">
              <div className="page-head">
                <h1 className="h1">Works</h1>
                <p className="meta">{defaultShown.filter((w) => w.availability === 'available').length} available</p>
              </div>
              <JustifiedRows works={defaultShown} priorityCount={2} morph={false} />
            </div>
          }
        >
          <WorksBrowser works={index} />
        </Suspense>
      </section>
      <section className="container reveal">
        <div className="contact-line">
          <p className="statement" style={{ maxWidth: '24ch' }}>Looking for a particular size or colour?</p>
          <div className="link-row">
            <EnquireButton request={{ type: 'commission' }}>Commission a work</EnquireButton>
            <Link href="/upcoming" className="textlink arrow">See what is on the easel</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
