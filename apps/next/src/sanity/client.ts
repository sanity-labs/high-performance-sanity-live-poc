import { createClient } from 'next-sanity'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'ppsg7ml5'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'watt'

export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-07-01',
  useCdn: true,
  perspective: 'published',
})
