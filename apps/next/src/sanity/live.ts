import { defineLive } from 'next-sanity/live'

import { client } from './client'

// Tokenless setup: the dataset is public, only published content is fetched
// and draft mode is never enabled. `browserToken: false` / `serverToken:
// false` silence the corresponding warnings and make the tokenless intent
// explicit.
export const { sanityFetch, SanityLive } = defineLive({
  client,
  browserToken: false,
  serverToken: false,
})
