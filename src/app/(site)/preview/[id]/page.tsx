import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArtworkDetail } from '@/components/detail/ArtworkDetail'
import { getAdminEmail } from '@/lib/auth'
import { getPublishedArtworks, getSettings } from '@/lib/data'
import { relatedWorks } from '@/lib/selectors'
import { getArtworkForStudio } from '@/lib/studio'

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }

/** Studio preview: the real page for any work, drafts included. Signed-in users only. */
async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, email] = await Promise.all([params, getAdminEmail()])
  if (!email) notFound()
  const work = await getArtworkForStudio(id).catch(() => null)
  if (!work) notFound()
  const [all, settings] = await Promise.all([getPublishedArtworks(), getSettings()])
  return (
    <>
      <div className="preview-bar" role="status">
        <span>{work.isPublished ? 'Preview. This work is on the website.' : 'Preview. Not on the website yet.'}</span>
        <Link href={`/admin/works/${work.id}`}>Back to Studio</Link>
      </div>
      <ArtworkDetail work={work} settings={settings} related={relatedWorks(all, work)} />
    </>
  )
}

export default function PreviewPage(props: PageProps<'/preview/[id]'>) {
  return (
    <Suspense fallback={<div className="container page" aria-busy="true" />}>
      <Preview params={props.params} />
    </Suspense>
  )
}
