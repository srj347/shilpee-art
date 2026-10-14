import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArtworkDetail } from '@/components/detail/ArtworkDetail'
import { getArtworkBySlug, getPublishedArtworks, getSettings } from '@/lib/data'
import { relatedWorks } from '@/lib/selectors'
import { workDescription, workOgImage } from '@/lib/seo'

export async function generateStaticParams() {
  const all = await getPublishedArtworks()
  // Cache Components needs at least one value; the placeholder renders "not found".
  return all.length ? all.map((w) => ({ slug: w.slug })) : [{ slug: '__placeholder__' }]
}

export async function generateMetadata({ params }: PageProps<'/works/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const work = await getArtworkBySlug(slug)
  if (!work) return { title: 'Work not found' }
  const og = workOgImage(work)
  return {
    title: work.title,
    description: workDescription(work),
    alternates: { canonical: `/works/${work.slug}` },
    openGraph: {
      title: `${work.title} · Shilpee Maitra`,
      description: workDescription(work),
      type: 'article',
      images: og ? [{ url: og, width: 1200, height: 630, alt: work.title }] : undefined,
    },
  }
}

async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [all, settings] = await Promise.all([getPublishedArtworks(), getSettings()])
  const work = all.find((w) => w.slug === slug)
  if (!work) notFound()
  return <ArtworkDetail work={work} settings={settings} related={relatedWorks(all, work)} />
}

function DetailSkeleton() {
  return (
    <div className="container">
      <div className="detail" aria-busy="true">
        <div style={{ aspectRatio: '4 / 3', background: 'var(--mount)' }} />
        <div className="stack">
          <div style={{ height: 40, width: '60%', background: 'var(--mount)' }} />
          <div style={{ height: 14, width: '80%', background: 'var(--mount)' }} />
        </div>
      </div>
    </div>
  )
}

export default function WorkPage(props: PageProps<'/works/[slug]'>) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={props.params} />
    </Suspense>
  )
}
