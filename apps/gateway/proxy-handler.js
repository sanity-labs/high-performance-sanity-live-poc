/**
 * Custom gateway proxy handler used purely for measurement.
 *
 * Every request the gateway actually forwards upstream flows through this
 * handler: deduplication leaders, skipped requests (non-RSC or cookie-bearing)
 * and fallbacks — plus every request when deduplication is disabled. Waiters
 * replay the stored leader response and never reach it. Incrementing a
 * cumulative counter here therefore measures exactly "requests that reached
 * the Next.js application".
 *
 * Watt's built-in per-application HTTP metrics (`http_request_all_*`) cannot
 * be used for this: they are registered with a `collect()` hook that resets
 * them on every scrape (they feed Watt's own health sampling), so they behave
 * as per-scrape windows, not cumulative counters.
 */

let counter = null

function upstreamCounter() {
  if (!counter) {
    const { client, registry } = globalThis.platformatic.prometheus
    counter = new client.Counter({
      name: 'poc_upstream_requests_total',
      help: 'Number of requests the gateway forwarded to the upstream application',
      registers: [registry],
    })
  }

  return counter
}

export function handler(request, reply, dest, options) {
  upstreamCounter().inc()
  return reply.from(dest, options)
}
