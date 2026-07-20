import Link from 'next/link'
import { notFound } from 'next/navigation'

import { client } from '@/sanity/client'
import { sanityFetch } from '@/sanity/live'
import { POST_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries'

interface Post {
  _id: string
  title: string | null
  slug: string | null
  excerpt: string | null
}

export async function generateStaticParams() {
  // Plain client fetch: sanityFetch tags the surrounding "use cache" scope,
  // which does not exist during static params collection.
  const slugs = await client.fetch<{ slug: string }[]>(POST_SLUGS_QUERY)
  return (slugs ?? []).map(({ slug }) => ({ slug }))
}

async function getPost(slug: string) {
  'use cache'

  const { data } = await sanityFetch({ query: POST_QUERY, params: { slug } })
  return { post: data as Post | null, renderedAt: new Date().toISOString() }
}

export default async function PostPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const { post, renderedAt } = await getPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="post">
      <Link className="back" href="/blog">
        ← All posts
      </Link>
      <h1>{post.title}</h1>
      <p className="rendered-at">
        Rendered at <time dateTime={renderedAt}>{renderedAt}</time>
      </p>
      <p className="excerpt">{post.excerpt}</p>
    </main>
  )
}
