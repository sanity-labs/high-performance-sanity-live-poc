/**
 * RSC-aware deduplication key.
 *
 * Only React Server Component requests (full refreshes and link prefetches)
 * are worth coalescing: they are the requests `router.refresh()` fires in
 * identical waves from every connected browser. Plain HTML navigations are
 * opted out by returning a falsy value, which Gateway 3.62+ counts as a skip
 * (`gateway_deduplication_skip_count`) and proxies directly.
 *
 * The key includes every header Next.js lists in its `Vary` response header
 * for RSC payloads (`rsc`, `next-router-prefetch`,
 * `next-router-segment-prefetch`, `next-router-state-tree`, `next-url`, as
 * selected by the `deduplication.headers` config), so distinct segment
 * payloads are never cross-served between clients.
 */
export function computeDeduplicationKey(request, context) {
  const isRsc =
    request.headers.rsc !== undefined ||
    request.headers['next-router-prefetch'] !== undefined ||
    request.headers['next-router-segment-prefetch'] !== undefined

  if (!isRsc) {
    return false
  }

  return JSON.stringify({
    origin: context.origin,
    method: context.method,
    url: context.url,
    headers: context.headers,
  })
}
