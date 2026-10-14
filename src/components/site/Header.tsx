'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

const LINKS = [
  { href: '/works', label: 'Works' },
  { href: '/upcoming', label: 'Upcoming' },
  { href: '/prints', label: 'Prints' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

type Contact = { email: string; whatsapp: string; instagram: string }

function isActive(pathname: string | null, href: string) {
  return !!pathname && (pathname === href || pathname.startsWith(`${href}/`))
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="nav-desktop" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? 'page' : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

function ActiveNav({ onRoute }: { onRoute: (p: string) => void }) {
  const pathname = usePathname()
  useEffect(() => onRoute(pathname), [pathname, onRoute])
  return <NavLinks pathname={pathname} />
}

export function Header({ name, contact }: { name: string; contact: Contact }) {
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [pathname, setPathname] = useState<string | null>(null)
  const lastY = useRef(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Hide on scroll down, show again on scroll up.
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const dy = y - lastY.current
        if (y < 80) setHidden(false)
        else if (dy > 6) setHidden(true)
        else if (dy < -6) setHidden(false)
        lastY.current = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the menu after navigation.
  const onRoute = useCallback((p: string) => {
    setPathname(p)
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const opener = buttonRef.current
    document.body.style.overflow = 'hidden'
    menuRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [open])

  const wa = contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}` : ''

  return (
    <>
      <header className={`site-header${hidden && !open ? ' is-hidden' : ''}`}>
        <div className="container">
          <Link href="/" className="wordmark" transitionTypes={['nav-back']}>
            {name}
          </Link>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <ActiveNav onRoute={onRoute} />
          </Suspense>
          <button
            ref={buttonRef}
            type="button"
            className="menu-button"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
        </div>
      </header>

      <div
        id="site-menu"
        ref={menuRef}
        className={`menu-overlay${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
      >
        <div className="container bar">
          <Link href="/" className="wordmark" onClick={() => setOpen(false)}>
            {name}
          </Link>
          <button type="button" className="menu-button" onClick={() => setOpen(false)} style={{ display: 'block' }}>
            Close
          </button>
        </div>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <ul className="menu-links">
            <li>
              <Link href="/" style={{ '--i': 0 } as React.CSSProperties} aria-current={pathname === '/' ? 'page' : undefined} onClick={() => setOpen(false)}>
                Home
              </Link>
            </li>
            {LINKS.map((l, i) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  style={{ '--i': i + 1 } as React.CSSProperties}
                  aria-current={isActive(pathname, l.href) ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="menu-contact">
            {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
            {wa ? <a href={wa} target="_blank" rel="noopener">WhatsApp</a> : null}
            {contact.instagram ? <a href={contact.instagram} target="_blank" rel="noopener">Instagram</a> : null}
          </div>
        </div>
      </div>
    </>
  )
}
