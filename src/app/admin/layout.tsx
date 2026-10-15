import type { Metadata, Viewport } from 'next'
import './admin.css'

export const metadata: Metadata = {
  title: { default: 'Studio', template: '%s · Studio' },
  robots: { index: false, follow: false },
  manifest: '/studio.webmanifest',
}

export const viewport: Viewport = { themeColor: '#fbfbf9', viewportFit: 'cover' }

export default function AdminRoot({ children }: LayoutProps<'/admin'>) {
  return children
}
