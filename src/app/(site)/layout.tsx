import { EnquiryProvider } from '@/components/enquiry/EnquiryProvider'
import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { RevealObserver } from '@/components/site/Reveal'
import { getSettings } from '@/lib/data'

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
