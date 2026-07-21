const METRICS_URL = process.env.PLT_METRICS_URL ?? 'http://127.0.0.1:9090/metrics'

const DEDUP_COUNTERS = ['leader', 'waiter', 'replay', 'fallback', 'error', 'skip']

const EMPTY_SNAPSHOT = Object.freeze({
  deduplication: Object.freeze(Object.fromEntries(DEDUP_COUNTERS.map((name) => [name, 0]))),
  upstream: Object.freeze({ next: 0 }),
})

/**
 * Parses a Prometheus text exposition body into `[{ name, labels, value }]`.
 */
function parseMetrics(body) {
  const series = []

  for (const line of body.split('\n')) {
    if (line === '' || line.startsWith('#')) {
      continue
    }

    const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*)\})?\s+(\S+)/.exec(line)
    if (!match) {
      continue
    }

    const [, name, rawLabels, rawValue] = match
    const value = Number(rawValue)
    if (!Number.isFinite(value)) {
      continue
    }

    const labels = {}
    if (rawLabels) {
      for (const labelMatch of rawLabels.matchAll(
        /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g,
      )) {
        labels[labelMatch[1]] = labelMatch[2]
      }
    }

    series.push({ name, labels, value })
  }

  return series
}

/**
 * Condenses the runtime Prometheus output into the counters the POC cares
 * about: the native gateway deduplication counters and the number of HTTP
 * requests that actually reached the Next.js application workers.
 *
 * "Requests reaching Next" comes from `poc_upstream_requests_total`, a
 * cumulative counter incremented by the custom proxy handler for every
 * request the gateway forwards upstream. Watt's own per-application HTTP
 * metrics (`http_request_all_*`) reset on every Prometheus scrape (their
 * `collect()` hook feeds Watt's health sampling), so they cannot serve as
 * cumulative request counters.
 */
function condense(series) {
  const deduplication = Object.fromEntries(DEDUP_COUNTERS.map((name) => [name, 0]))
  let nextRequests = 0

  for (const { name, value } of series) {
    const dedupMatch = /^gateway_deduplication_(\w+)_count$/.exec(name)
    if (dedupMatch && DEDUP_COUNTERS.includes(dedupMatch[1])) {
      deduplication[dedupMatch[1]] += value
      continue
    }

    if (name === 'poc_upstream_requests_total') {
      nextRequests += value
    }
  }

  return {
    deduplication,
    upstream: { next: nextRequests },
  }
}

function diff(current, baseline) {
  return {
    deduplication: Object.fromEntries(
      DEDUP_COUNTERS.map((name) => [
        name,
        current.deduplication[name] - (baseline?.deduplication[name] ?? 0),
      ]),
    ),
    upstream: { next: current.upstream.next - (baseline?.upstream.next ?? 0) },
  }
}

export default async function statsPlugin(app) {
  const dedupEnabled = process.env.PLT_DEDUP !== 'false'
  let baseline = null
  let baselineAt = null

  async function snapshot() {
    const response = await fetch(METRICS_URL)
    if (!response.ok) {
      throw new Error(`metrics endpoint replied with HTTP ${response.status}`)
    }
    return condense(parseMetrics(await response.text()))
  }

  app.get('/api/stats', async (_request, reply) => {
    let current
    try {
      current = await snapshot()
    } catch (error) {
      return reply.code(503).send({ error: `stats unavailable: ${error.message}` })
    }

    if (!baseline) {
      baseline = current
      baselineAt = new Date().toISOString()
    }

    return {
      totals: {
        deduplication: { enabled: dedupEnabled, ...current.deduplication },
        upstream: current.upstream,
      },
      sinceBaseline: {
        deduplication: { enabled: dedupEnabled, ...diff(current, baseline).deduplication },
        upstream: diff(current, baseline).upstream,
      },
      baselineAt,
      generatedAt: new Date().toISOString(),
    }
  })

  app.post('/api/stats/baseline', async (_request, reply) => {
    try {
      baseline = await snapshot()
    } catch (error) {
      baseline = structuredClone(EMPTY_SNAPSHOT)
      app.log.warn({ err: error }, 'stats baseline reset before metrics were available')
    }
    baselineAt = new Date().toISOString()
    return reply.code(200).send({ baselineAt })
  })
}
