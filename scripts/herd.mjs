/**
 * Synthetic herd: fires N concurrent, byte-identical RSC-style GET requests
 * at the gateway — the shape of the wave every browser emits after
 * `router.refresh()` — and reports how many of them actually reached the
 * Next.js workers, using the gateway-owned /api/stats condenser
 * (Prometheus deltas relative to a baseline captured right before release).
 *
 * Usage:
 *   pnpm herd                        # 200 requests against /blog
 *   pnpm herd -- --n 500             # bigger herd
 *   pnpm herd -- --url /blog/leader-of-the-pack
 *   pnpm herd -- --base http://127.0.0.1:3000
 */

import { setTimeout as sleep } from 'node:timers/promises'
import { styleText } from 'node:util'

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? fallback : process.argv[index + 1]
}

const base = argValue('--base', 'http://127.0.0.1:3000')
const path = argValue('--url', '/blog')
const herdSize = Number(argValue('--n', '200'))
// Next.js expects the bare `_rsc` cache-buster parameter on RSC requests and
// 307-redirects to its canonical form otherwise. Building the canonical URL
// up front matters: a redirect would be silently followed by fetch() and
// every herd member would count twice.
const canonicalPath = path.includes('_rsc') ? path : `${path}${path.includes('?') ? '&' : '?'}_rsc`
const url = new URL(canonicalPath, base)

// The header set of a `router.refresh()` refetch: mark the request as an RSC
// fetch. All requests in the herd share the exact same URL and headers, so
// with deduplication enabled they coalesce onto a single key.
const headers = {
  rsc: '1',
  accept: '*/*',
}

async function stats() {
  const response = await fetch(new URL('/api/stats', base))
  if (!response.ok) {
    throw new Error(`GET /api/stats failed with HTTP ${response.status}`)
  }
  return response.json()
}

// Warm-up: make sure the route is compiled/cached, outside the measurement.
const warm = await fetch(url, { headers })
await warm.arrayBuffer()
if (!warm.ok) {
  console.error(`Warm-up request failed with HTTP ${warm.status}; aborting.`)
  process.exit(1)
}
await sleep(250)

// Capture the measurement baseline only after the warm-up settled.
const baselineResponse = await fetch(new URL('/api/stats/baseline', base), { method: 'POST' })
if (!baselineResponse.ok) {
  console.error(`POST /api/stats/baseline failed with HTTP ${baselineResponse.status}; aborting.`)
  process.exit(1)
}

// Prepare the entire herd behind a synchronization barrier, then release it.
let release
const barrier = new Promise((resolve) => {
  release = resolve
})

const herd = Array.from({ length: herdSize }, async () => {
  await barrier
  try {
    // redirect: 'manual' keeps the measurement honest: a redirect would
    // otherwise be followed transparently and double the request count.
    const response = await fetch(url, { headers, redirect: 'manual' })
    const body = await response.arrayBuffer()
    return { status: response.status, bytes: body.byteLength }
  } catch (error) {
    return { status: 0, bytes: 0, error: String(error) }
  }
})

const startedAt = process.hrtime.bigint()
release()
const results = await Promise.all(herd)
const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6

// Let the runtime metrics catch up before sampling.
await sleep(500)
const report = await stats()

const ok = results.filter((result) => result.status === 200).length
const failed = herdSize - ok
const { deduplication, upstream } = report.sinceBaseline
const dedupEnabled = report.totals.deduplication.enabled

const rows = [
  ['Deduplication', dedupEnabled ? 'on' : 'off'],
  ['Client requests', herdSize],
  ['Successful responses (200)', ok],
  ['Failed responses', failed],
  ['Requests reaching Next', upstream.next],
  ['Leaders', deduplication.leader],
  ['Waiters', deduplication.waiter],
  ['Replays', deduplication.replay],
  ['Fallbacks', deduplication.fallback],
  ['Skips', deduplication.skip],
  ['Errors', deduplication.error],
  ['Wall time', `${elapsedMs.toFixed(0)} ms`],
]

const width = Math.max(...rows.map(([label]) => label.length))
console.log()
console.log(styleText('bold', `herd: ${herdSize} concurrent GET ${url.pathname} (rsc)`))
console.log('─'.repeat(width + 12))
for (const [label, value] of rows) {
  console.log(`${label.padEnd(width)}  ${styleText('bold', String(value))}`)
}
console.log('─'.repeat(width + 12))
console.log(
  dedupEnabled
    ? styleText(
        'green',
        `${herdSize} client requests collapsed to ${upstream.next} upstream request(s).`,
      )
    : styleText('yellow', `${upstream.next} of ${herdSize} requests hit Next (dedup off).`),
)
console.log()
