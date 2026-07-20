import { createRequire } from 'node:module'

import type { NextConfig } from 'next'
import { sanity } from 'next-sanity/live/cache-life'

const require = createRequire(import.meta.url)
const { version: nextVersion } = require('next/package.json') as { version: string }

export default {
  cacheComponents: true,
  cacheLife: {
    // Sanity Live handles on-demand revalidation, so the default 15 minute
    // time-based revalidation is far too short.
    default: sanity,
  },
  env: {
    NEXT_PUBLIC_NEXT_VERSION: nextVersion,
  },
} satisfies NextConfig
