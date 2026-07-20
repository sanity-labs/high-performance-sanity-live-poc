/**
 * The deterministic set of demo posts. Fixed `_id`s make seeding idempotent
 * and cleanup precise. Shared by `scripts/seed.mjs` and the Studio Load test
 * tool (which inlines the same ids).
 */

const TOPICS = [
  ['Herd at the gate', 'A field guide to synchronized browser refreshes.'],
  ['Leader of the pack', 'One request renders, everyone else replays.'],
  ['The waiter pattern', 'Politely queueing instead of trampling the origin.'],
  ['Stale while stampeding', 'What lazy revalidation used to protect us from.'],
  ['Prefetch me maybe', 'In-viewport links and their eager little fingers.'],
  ['Segment by segment', 'How one link becomes many RSC requests.'],
  ['Tags on the loose', 'updateTag, revalidateTag, and the cache in between.'],
  ['Live from the lake', 'Content Lake events land in every open tab at once.'],
  ['ISR write club', 'The first rule is: everyone writes at the same time.'],
  ['Coalesce or collapse', 'Request deduplication as an origin shield.'],
  ['The 250ms lock', 'Short leases, long consequences.'],
  ['Replay it again', 'Buffered responses for the patient majority.'],
  ['Worker bees', 'Multiplying renderers without multiplying renders.'],
  ['Valkey to the kingdom', 'Sharing dedup state across instances.'],
  ['Memory lane', 'Single-instance storage for single-instance problems.'],
  ['The Vary contract', 'Why RSC headers belong in the dedup key.'],
  ['Cookie cutter', 'Per-user requests that never coalesce.'],
  ['Router refreshments', 'What actually happens after router.refresh().'],
  ['Viewport vultures', 'Links that watch and wait and fetch.'],
  ['Gateway drug', 'Start with proxying, end with observability.'],
  ['Metrics or it did not happen', 'Counting leaders, waiters and replays.'],
  ['The thundering few', 'Reducing N times L times S to roughly one.'],
  ['Publish and perish', 'A single edit, a thousand renders.'],
  ['Calm after the storm', 'The blog reads the same, the origin sighs.'],
]

export function buildPosts() {
  return TOPICS.map(([title, excerpt], index) => {
    const number = String(index + 1).padStart(3, '0')
    return {
      _id: `post-${number}`,
      _type: 'post',
      title,
      slug: {
        _type: 'slug',
        current: title
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, '-')
          .replaceAll(/(^-|-$)/g, ''),
      },
      excerpt,
    }
  })
}
