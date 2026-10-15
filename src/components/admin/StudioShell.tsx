'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from './api'

type Ctx = { toast: (message: string) => void; setNewCount: (n: number) => void }
const StudioContext = createContext<Ctx>({ toast: () => {}, setNewCount: () => {} })
export const useStudio = () => useContext(StudioContext)

const NAV = [
  { href: '/admin', label: 'Works', match: (p: string) => p === '/admin' || p.startsWith('/admin/works') },
  { href: '/admin/enquiries', label: 'Enquiries', match: (p: string) => p.startsWith('/admin/enquiries') },
  { href: '/admin/settings', label: 'Settings', match: (p: string) => p.startsWith('/admin/settings') },
]

export function StudioShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname()
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null)
  const [newCount, setNewCount] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const toast = useCallback((text: string) => {
    setMessage((prev) => ({ text, id: (prev?.id ?? 0) + 1 }))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2600)
  }, [])

  useEffect(() => {
    api<{ newCount: number }>('/api/admin/enquiries?status=new')
      .then((d) => setNewCount(d.newCount))
      .catch(() => {})
  }, [pathname])

  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {})
    window.location.replace(new URL('/admin/sign-in', window.location.origin).href)
  }

  const badge = newCount > 0 ? <span className="badge" aria-label={`${newCount} new`}>{newCount}</span> : null

  return (
    <StudioContext.Provider value={{ toast, setNewCount }}>
      <div className="studio">
        <header className="studio-top">
          <div className="row">
            <Link href="/admin" className="studio-brand">
              Shilpee Maitra<small>Studio</small>
            </Link>
            <nav className="studio-links" aria-label="Studio">
              <span className="studio-desktop-nav studio-links">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} aria-current={n.match(pathname) ? 'page' : undefined}>
                    {n.label} {n.href === '/admin/enquiries' ? badge : null}
                  </Link>
                ))}
              </span>
              <a href="/" target="_blank" rel="noopener">View site</a>
              <button type="button" onClick={signOut} title={`Signed in as ${email}`}>Sign out</button>
            </nav>
          </div>
        </header>
        {children}
        <nav className="studio-tabs" aria-label="Studio sections">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.match(pathname) ? 'page' : undefined}>
              {n.label}
              {n.href === '/admin/enquiries' ? badge : null}
            </Link>
          ))}
        </nav>
        {message ? (
          <div className="toast" role="status" key={message.id}>
            {message.text}
          </div>
        ) : null}
      </div>
    </StudioContext.Provider>
  )
}
