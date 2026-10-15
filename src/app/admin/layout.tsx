import type { Metadata, Viewport } from 'next'
import './admin.css'

// Studio is private and reads the session on every request, so instant-navigation
// validation does not apply; signed-out visitors are sent to sign-in.
export const instant = false

export const metadata: Metadata = {
  title: { default: 'Studio', template: '%s · Studio' },
  robots: { index: false, follow: false },
  manifest: '/studio.webmanifest',
}

export const viewport: Viewport = { themeColor: '#fbfbf9', viewportFit: 'cover' }

export default function AdminRoot({ children }: LayoutProps<'/admin'>) {
  return children
}
