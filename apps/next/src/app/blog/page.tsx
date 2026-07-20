import Link from 'next/link'

import { StatsStrip } from '@/components/stats-strip'
import { sanityFetch } from '@/sanity/live'
import { POSTS_QUERY } from '@/sanity/queries'

interface PostListItem {
  _id: string
  title: string | null
  slug: string | null
  excerpt: string | null
}

async function BlogList() {
  'use cache'

  const { data } = await sanityFetch({ query: POSTS_QUERY })
  const posts = (data ?? []) as PostListItem[]
  const renderedAt = new Date().toISOString()

  return (
    <>
      <p className="rendered-at">
        List rendered at <time dateTime={renderedAt}>{renderedAt}</time>
      </p>
      {posts.length === 0 ? (
        <p className="empty">
          No posts yet. Run <code>pnpm seed</code> or use the Studio Load test tool.
        </p>
      ) : (
        <ul className="grid">
          {posts.map((post) => (
            <li key={post._id}>
              <Link className="card" href={`/blog/${post.slug}`}>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function BlogPage() {
  return (
    <main className="blog">
      <header className="masthead">
        <div>
          <h1>The Stampede Gazette</h1>
          <p className="subtitle">
            Every card is an in-viewport <code>&lt;Link&gt;</code>. A publish in the Studio makes
            every open tab refresh and eagerly re-prefetch all of them at once.
          </p>
        </div>
        <span className="badge">next {process.env.NEXT_PUBLIC_NEXT_VERSION}</span>
      </header>
      <StatsStrip />
      <BlogList />
    </main>
  )
}
