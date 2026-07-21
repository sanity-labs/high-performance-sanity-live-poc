import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SanityLive } from '@/sanity/live'

import { eagerSanityAction } from './actions'

import './globals.css'

export const metadata: Metadata = {
  title: 'Gateway dedup POC',
  description:
    'Platformatic Gateway request deduplication vs the Next.js 16 router.refresh() prefetch stampede',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SanityLive action={eagerSanityAction} />
      </body>
    </html>
  )
}
