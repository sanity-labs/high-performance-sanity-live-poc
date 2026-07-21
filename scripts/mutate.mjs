/**
 * Fires a single publish-style mutation: patches one post's title with a
 * fresh timestamp suffix. Every open tab subscribed via <SanityLive> receives
 * the resulting live event and triggers the refresh (and, with the eager
 * action, the prefetch stampede).
 *
 * Usage: STUDIO_AUTH_TOKEN=... pnpm mutate [-- --id post-001]
 */

import { createAuthedClient } from './sanity-client.mjs'

const idFlag = process.argv.indexOf('--id')
const id = idFlag === -1 ? 'post-001' : process.argv[idFlag + 1]

const client = createAuthedClient()

const existing = await client.getDocument(id)
if (!existing) {
  console.error(`Document ${id} not found. Run \`pnpm seed\` first.`)
  process.exit(1)
}

const baseTitle = String(existing.title ?? id).split(' · ')[0]
const stamp = new Date().toISOString().slice(11, 19)
const title = `${baseTitle} · ${stamp}`

await client.patch(id).set({ title }).commit()

console.log(`Patched ${id}: ${JSON.stringify(title)}`)
