/**
 * Idempotently seeds the dataset with the deterministic demo posts.
 * Safe to re-run: documents are created with fixed ids via createOrReplace.
 *
 * Usage: STUDIO_AUTH_TOKEN=... pnpm seed
 */

import { buildPosts } from './posts.mjs'
import { createAuthedClient, dataset, projectId } from './sanity-client.mjs'

const client = createAuthedClient()
const posts = buildPosts()

const transaction = client.transaction()
for (const post of posts) {
  transaction.createOrReplace(post)
}

await transaction.commit()

console.log(`Seeded ${posts.length} posts into ${projectId}/${dataset}.`)
