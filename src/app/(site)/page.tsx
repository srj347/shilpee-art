import Link from 'next/link'
import { ArtImage } from '@/components/art/ArtImage'
import { ArtworkCard, WorkMedia } from '@/components/art/ArtworkCard'
import { EyeLevelHang } from '@/components/art/EyeLevelHang'
import { StatusLine, WallLabel } from '@/components/art/WallLabel'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { getPublishedArtworks, getSettings } from '@/lib/data'
import { sizeCm } from '@/lib/format'
import { featuredWorks, heroWork, mainImage, printWorks, upcomingWorks } from '@/lib/selectors'

export default async function HomePage() {
  const [all, settings] = await Promise.all([getPublishedArtworks(), getSettings()])
  const hero = heroWork(all)
  const featured = featuredWorks(all, hero?.id)
  const upcoming = upcomingWorks(all)[0]
  const prints = printWorks(all).slice(0, 3)
  const upImg = upcoming ? mainImage(upcoming) : undefined
  const first = settings.artistName.split(' ')[0]

  return (
    <div className="page">
      {hero ? (
        <section className="container hero" aria-label="Featured work">
          <div className="hero-figure">
            <Link
              href={`/works/${hero.slug}`}
              className="card"
              transitionTypes={['nav-forward']}
              style={{ width: '100%', maxWidth: `calc(78vh * ${(mainImage(hero)!.width / mainImage(hero)!.height).toFixed(3)})` }}
            >
              <WorkMedia work={hero} sizes="(max-width: 1600px) 100vw, 1600px" priority />
              <WallLabel work={hero} />
            </Link>
          </div>
        </section>
      ) : (
        <section className="container">
          <p className="statement">New work is on its way. Please visit again soon.</p>
        </section>
      )}

      <section className="container reveal">
        <p className="statement">{settings.statement}</p>
      </section>

      {featured.length ? (
        <section className="container" aria-labelledby="selected-title">
          <div className="section-head">
            <h2 id="selected-title" className="eyebrow">Selected works</h2>
            <Link href="/works" className="textlink arrow">All available works</Link>
          </div>
          <EyeLevelHang works={featured} />
        </section>
      ) : null}

      {upcoming && upImg ? (
        <section className="container reveal" aria-labelledby="easel-title">
          <div className="split">
            <Link href={`/works/${upcoming.slug}`} className="card-media-link" transitionTypes={['nav-forward']}>
              <WorkMedia work={upcoming} sizes="(max-width: 899px) 100vw, 45vw" />
            </Link>
            <div className="stack-lg">
              <div className="stack">
                <h2 id="easel-title" className="eyebrow">On the easel</h2>
                <p className="work-title">{upcoming.title}</p>
                <p className="meta">{upcoming.medium} · {sizeCm(upcoming.heightCm, upcoming.widthCm)}</p>
                <StatusLine work={upcoming} />
              </div>
              {upcoming.upcoming.studioNote ? <div className="prose"><p>{upcoming.upcoming.studioNote}</p></div> : null}
              <div className="link-row">
                <EnquireButton
                  request={{
                    type: 'upcoming',
                    artwork: { id: upcoming.id, title: upcoming.title, year: upcoming.year, meta: 'In the studio', size: sizeCm(upcoming.heightCm, upcoming.widthCm), image: upImg, slug: upcoming.slug },
                  }}
                >
                  Register interest
                </EnquireButton>
                <Link href="/upcoming" className="textlink arrow">More from the studio</Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="container reveal" aria-labelledby="artist-title">
        <div className="split">
          {settings.portrait ? (
            <ArtImage image={settings.portrait} sizes="(max-width: 899px) 100vw, 45vw" />
          ) : (
            <div />
          )}
          <div className="stack-lg">
            <h2 id="artist-title" className="eyebrow">The artist</h2>
            <div className="prose">
              <p>{settings.about.split(/\n{2,}/).find((p) => !p.startsWith('Sample text')) ?? settings.statement}</p>
            </div>
            <Link href="/about" className="textlink arrow">About {first}</Link>
          </div>
        </div>
      </section>

      {prints.length ? (
        <section className="container reveal" aria-labelledby="prints-title">
          <div className="section-head">
            <div className="stack" style={{ gap: 8 }}>
              <h2 id="prints-title" className="eyebrow">Prints</h2>
              <p className="muted" style={{ maxWidth: '34rem' }}>Archival prints of selected paintings, made to order and signed.</p>
            </div>
            <Link href="/prints" className="textlink arrow">Explore prints</Link>
          </div>
          <div className="three">
            {prints.map((w) => (
              <ArtworkCard key={w.id} work={w} sizes="(max-width: 599px) 100vw, 33vw" showPrintPrice morph={false} hrefSuffix="#prints" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="container reveal">
        <div className="contact-line">
          <p className="statement" style={{ maxWidth: '22ch' }}>Commissions and studio visits by appointment.</p>
          <div className="link-row">
            <EnquireButton request={{ type: 'commission' }}>Commission a work</EnquireButton>
            <Link href="/contact" className="textlink">Send a message</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
