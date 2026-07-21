import { createClient } from '@sanity/client'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'ppsg7ml5'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'watt'

export function createAuthedClient() {
  const token = process.env.STUDIO_AUTH_TOKEN

  if (!token) {
    console.error(
      'STUDIO_AUTH_TOKEN is not set. Provide a Sanity token with write access to run this script.',
    )
    process.exit(1)
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: '2025-07-01',
    token,
    useCdn: false,
  })
}
