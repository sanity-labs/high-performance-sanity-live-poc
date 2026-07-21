'use client'

import { useCallback, useEffect, useState } from 'react'

interface Stats {
  deduplication: {
    enabled: boolean
    leader: number
    waiter: number
    replay: number
    fallback: number
    error: number
    skip: number
  }
  upstream: {
    next: number
  }
}

interface StatsResponse {
  totals: Stats
  sinceBaseline: Stats
}

const POLL_INTERVAL_MS = 1_000

export function StatsStrip() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const response = await fetch('/api/stats', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = (await response.json()) as StatsResponse
        if (!cancelled) {
          setStats(data)
          setFailed(false)
        }
      } catch {
        if (!cancelled) {
          setFailed(true)
        }
      }
    }

    void poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const resetBaseline = useCallback(() => {
    fetch('/api/stats/baseline', { method: 'POST' }).catch(() => {})
  }, [])

  if (failed) {
    return (
      <aside className="stats stats-error">
        Stats unavailable — is the app running behind the gateway on :3000?
      </aside>
    )
  }

  if (!stats) {
    return <aside className="stats">Loading gateway stats…</aside>
  }

  const { deduplication, upstream } = stats.sinceBaseline
  const dedupEnabled = stats.totals.deduplication.enabled

  return (
    <aside className="stats">
      <span className={dedupEnabled ? 'pill pill-on' : 'pill pill-off'}>
        dedup {dedupEnabled ? 'ON' : 'OFF'}
      </span>
      <dl>
        <div>
          <dt>reached Next</dt>
          <dd>{upstream.next}</dd>
        </div>
        <div>
          <dt>leaders</dt>
          <dd>{deduplication.leader}</dd>
        </div>
        <div>
          <dt>waiters</dt>
          <dd>{deduplication.waiter}</dd>
        </div>
        <div>
          <dt>replays</dt>
          <dd>{deduplication.replay}</dd>
        </div>
        <div>
          <dt>fallbacks</dt>
          <dd>{deduplication.fallback}</dd>
        </div>
        <div>
          <dt>skips</dt>
          <dd>{deduplication.skip}</dd>
        </div>
      </dl>
      <button type="button" onClick={resetBaseline}>
        Reset counters
      </button>
    </aside>
  )
}
