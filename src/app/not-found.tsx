import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
      <p className="eyebrow">Not found</p>
      <h1 className="h1">This page is not on the wall.</h1>
      <p className="muted">The work may have been moved or sold. See what is available now.</p>
      <div className="link-row">
        <Link href="/works" className="btn">See works</Link>
        <Link href="/" className="textlink">Home</Link>
      </div>
    </main>
  )
}
