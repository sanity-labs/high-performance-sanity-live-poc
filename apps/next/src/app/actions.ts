'use server'

import { parseTags } from 'next-sanity/live'
import { updateTag } from 'next/cache'

/**
 * Eager revalidation action for `<SanityLive />`.
 *
 * The default action shipped by `next-sanity` mitigates the refresh stampede
 * by calling `revalidateTag(tag, 'max')`, which marks cache entries STALE and
 * lets them be refreshed lazily on the next user intent. This POC needs the
 * pre-mitigation behavior from next.js#93210, so it calls `updateTag(tag)`
 * instead: entries are marked REVALIDATED and the follow-up
 * `router.refresh()` triggers an eager re-prefetch of every in-viewport link
 * in every connected browser.
 *
 * Returning `'refresh'` is load-bearing: `<SanityLive />` only calls
 * `router.refresh()` when the action resolves to exactly that string.
 */
export async function eagerSanityAction(unsafeTags: unknown): Promise<void | 'refresh'> {
  const { tags } = parseTags(unsafeTags)

  for (const tag of tags) {
    updateTag(tag)
  }

  return 'refresh'
}
