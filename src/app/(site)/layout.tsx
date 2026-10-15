import { EnquiryProvider } from '@/components/enquiry/EnquiryProvider'
import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { RevealObserver } from '@/components/site/Reveal'
import type { Metadata } from 'next'
import { getPublishedArtworks, getSettings } from '@/lib/data'
import { heroWork } from '@/lib/selectors'
import { workOgImage } from '@/lib/seo'

/** Pages without their own preview image share the Home hero's, so links never show a blank card. */
export async function generateMetadata(): Promise<Metadata> {
  const [all, settings] = await Promise.all([getPublishedArtworks(), getSettings()])
  const hero = heroWork(all)
  const og = hero ? workOgImage(hero) : undefined
  return {
    description: settings.statement,
    openGraph: {
      siteName: settings.artistName,
      locale: 'en_IN',
      type: 'website',
      images: og ? [{ url: og, width: 1200, height: 630, alt: hero!.title }] : undefined,
    },
  }
}

export default async function SiteLayout({ children }: LayoutProps<'/'>) {
  const settings = await getSettings()
  const { contact, artistName } = settings
  return (
    <EnquiryProvider contact={{ whatsapp: contact.whatsapp, replyPromise: contact.replyPromise, artistName }}>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header name={artistName} contact={contact} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <RevealObserver />
    </EnquiryProvider>
  )
}
