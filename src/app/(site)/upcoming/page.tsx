import type { Metadata } from 'next'
import Link from 'next/link'
import { WorkMedia } from '@/components/art/ArtworkCard'
import { JustifiedRows } from '@/components/art/JustifiedRows'
import { StatusLine } from '@/components/art/WallLabel'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { getPublishedArtworks, getSettings } from '@/lib/data'
import { sizeCm } from '@/lib/format'
import { mainImage, upcomingWorks } from '@/lib/selectors'

export const metadata: Metadata = {
  title: 'On the easel',
  description: 'Works in progress in Shilpee Maitra’s studio. Register interest to hear first when one is finished.',
  alternates: { canonical: '/upcoming' },
}

export default async function UpcomingPage() {
  const [all, settings] = await Promise.all([getPublishedArtworks(), getSettings()])
  const works = upcomingWorks(all)
  const first = settings.artistName.split(' ')[0]
  const recent = all
    .filter((w) => w.availability === 'available')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, 3)

  return (
    <div className="page">
      <section className="container narrow">
        <div className="page-head">
          <h1 className="h1">On the easel</h1>
          <p className="prose">Works in progress in the studio. Register interest and {first} will write to you first when one is finished.</p>
        </div>
      </section>

      <section className="container narrow">
        {works.length ? (
          <div className="journal">
            {works.map((w) => {
              const img = mainImage(w)
              return (
                <article key={w.id} className="entry reveal">
                  <Link href={`/works/${w.slug}`} className="card-media-link" transitionTypes={['nav-forward']}>
                    <WorkMedia work={w} sizes="(max-width: 800px) 100vw, 720px" />
                  </Link>
                  <div className="entry-meta">
                    <h2 className="work-title" style={{ fontSize: 28 }}>{w.title}</h2>
                    <p className="meta">{w.medium} · {sizeCm(w.heightCm, w.widthCm)}</p>
                    <StatusLine work={w} />
                  </div>
                  {w.upcoming.studioNote ? <div className="prose"><p>{w.upcoming.studioNote}</p></div> : null}
                  <div className="link-row">
                    <EnquireButton
                      request={{
                        type: 'upcoming',
                        artwork: { id: w.id, title: w.title, year: w.year, meta: 'In the studio', size: sizeCm(w.heightCm, w.widthCm), image: img, slug: w.slug },
                      }}
                    >
                      Register interest
                    </EnquireButton>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="muted">Nothing on the easel to show right now. New work appears here first.</p>
        )}
      </section>

      {recent.length ? (
        <section className="container reveal" aria-labelledby="recent-title">
          <div className="section-head">
            <h2 id="recent-title" className="eyebrow">Recently finished</h2>
            <Link href="/works" className="textlink arrow">All works</Link>
          </div>
          <JustifiedRows works={recent} />
        </section>
      ) : null}
    </div>
  )
}
