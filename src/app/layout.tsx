import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Newsreader, Schibsted_Grotesk } from 'next/font/google'
import { env } from '@/lib/env'
import './globals.css'

const sans = Schibsted_Grotesk({ variable: '--font-sans', subsets: ['latin'], display: 'swap' })
const serif = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: 'Shilpee Maitra · Paintings', template: '%s · Shilpee Maitra' },
  description: 'Abstract paintings in acrylic and watercolour by Shilpee Maitra, made in her studio in Hyderabad.',
  openGraph: { siteName: 'Shilpee Maitra', locale: 'en_IN', type: 'website' },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: '#fbfbf9',
  viewportFit: 'cover',
}

const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        {/* Marks that JavaScript runs, so fade-ins never hide content when it does not. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {children}
        {umamiId ? (
          <Script src="https://cloud.umami.is/script.js" data-website-id={umamiId} strategy="afterInteractive" />
        ) : null}
      </body>
    </html>
  )
}
