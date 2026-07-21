import Link from 'next/link'

export default function Home() {
  return (
    <main className="hero">
      <h1>Gateway dedup POC</h1>
      <p>
        Platformatic Gateway request deduplication vs the Next.js 16 <code>router.refresh()</code>{' '}
        prefetch stampede (next.js#93210).
      </p>
      <Link className="cta" href="/blog">
        Open the blog →
      </Link>
    </main>
  )
}
