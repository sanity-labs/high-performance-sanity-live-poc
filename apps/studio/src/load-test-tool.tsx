import { RocketIcon } from '@sanity/icons/Rocket'
import { Badge, Box, Button, Card, Code, Flex, Grid, Stack, Text, TextInput } from '@sanity/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { definePlugin, useClient } from 'sanity'

import { buildPosts } from '../../../scripts/posts.mjs'

const API_VERSION = '2025-07-01'
const MAX_LOG_LINES = 60

function LoadTestTool() {
  const client = useClient({ apiVersion: API_VERSION })
  const posts = useMemo(() => buildPosts(), [])

  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [storming, setStorming] = useState(false)
  const [intervalMs, setIntervalMs] = useState('1500')
  const [batchSize, setBatchSize] = useState('3')

  const stormTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stormWave = useRef(0)

  const append = useCallback((line: string) => {
    const stamp = new Date().toISOString().slice(11, 19)
    setLog((existing) => [`${stamp}  ${line}`, ...existing].slice(0, MAX_LOG_LINES))
  }, [])

  const seed = useCallback(async () => {
    setBusy(true)
    try {
      const transaction = client.transaction()
      for (const post of posts) {
        transaction.createOrReplace(post)
      }
      await transaction.commit()
      append(`Seeded ${posts.length} posts (idempotent createOrReplace).`)
    } catch (error) {
      append(`Seed failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }, [append, client, posts])

  const mutateBatch = useCallback(
    async (size: number, async: boolean) => {
      const offset = stormWave.current * size
      const batch = Array.from(
        { length: size },
        (_, index) => posts[(offset + index) % posts.length],
      )
      const stamp = new Date().toISOString().slice(11, 19)

      const transaction = client.transaction()
      for (const post of batch) {
        transaction.patch(post._id, (patch) => patch.set({ title: `${post.title} · ${stamp}` }))
      }
      await transaction.commit({ visibility: async ? 'async' : 'sync' })

      return batch.map((post) => post._id)
    },
    [client, posts],
  )

  const publishOne = useCallback(async () => {
    setBusy(true)
    try {
      const ids = await mutateBatch(1, false)
      append(`Publish-style mutation committed: ${ids.join(', ')} → live event → refresh wave.`)
      stormWave.current += 1
    } catch (error) {
      append(`Mutation failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }, [append, mutateBatch])

  const stopStorm = useCallback(() => {
    if (stormTimer.current) {
      clearInterval(stormTimer.current)
      stormTimer.current = null
    }
    setStorming(false)
    append('Mutation storm stopped.')
  }, [append])

  const startStorm = useCallback(() => {
    const interval = Math.max(Number(intervalMs) || 1500, 250)
    const size = Math.min(Math.max(Number(batchSize) || 3, 1), posts.length)

    setStorming(true)
    append(`Mutation storm started: ${size} patch(es) every ${interval} ms (visibility: async).`)

    stormTimer.current = setInterval(() => {
      mutateBatch(size, true)
        .then((ids) => {
          stormWave.current += 1
          append(`Storm wave ${stormWave.current}: patched ${ids.join(', ')}.`)
        })
        .catch((error: unknown) => {
          append(`Storm wave failed: ${String(error)}`)
        })
    }, interval)
  }, [append, batchSize, intervalMs, mutateBatch, posts.length])

  const cleanup = useCallback(async () => {
    setBusy(true)
    try {
      const transaction = client.transaction()
      for (const post of posts) {
        transaction.delete(post._id)
      }
      await transaction.commit()
      append(`Deleted the ${posts.length} seeded posts.`)
    } catch (error) {
      append(`Cleanup failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }, [append, client, posts])

  useEffect(() => {
    return () => {
      if (stormTimer.current) {
        clearInterval(stormTimer.current)
      }
    }
  }, [])

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Card padding={4} radius={3} shadow={1}>
          <Stack space={4}>
            <Flex align="center" gap={3}>
              <Text size={3} weight="bold">
                Load test
              </Text>
              {storming && <Badge tone="critical">storm running</Badge>}
            </Flex>
            <Text muted size={1}>
              Every committed mutation emits a Sanity Live event. Each open tab of the blog on
              http://localhost:3000/blog reacts with the eager updateTag action and calls
              router.refresh(), producing the in-viewport prefetch stampede the gateway
              deduplicates. Watch the stats strip on /blog (or /api/stats) while driving load from
              here.
            </Text>
            <Grid columns={[1, 2, 4]} gap={3}>
              <Button
                disabled={busy || storming}
                mode="default"
                text="Seed 24 posts"
                tone="primary"
                onClick={seed}
              />
              <Button
                disabled={busy || storming}
                mode="default"
                text="Single publish mutation"
                tone="positive"
                onClick={publishOne}
              />
              <Button
                disabled={busy}
                mode="default"
                text={storming ? 'Stop mutation storm' : 'Start mutation storm'}
                tone={storming ? 'critical' : 'caution'}
                onClick={storming ? stopStorm : startStorm}
              />
              <Button
                disabled={busy || storming}
                mode="ghost"
                text="Delete seeded posts"
                tone="critical"
                onClick={cleanup}
              />
            </Grid>
            <Grid columns={[1, 2]} gap={3}>
              <Stack space={2}>
                <Text muted size={1}>
                  Storm interval (ms)
                </Text>
                <TextInput
                  disabled={storming}
                  value={intervalMs}
                  onChange={(event) => setIntervalMs(event.currentTarget.value)}
                />
              </Stack>
              <Stack space={2}>
                <Text muted size={1}>
                  Patches per wave
                </Text>
                <TextInput
                  disabled={storming}
                  value={batchSize}
                  onChange={(event) => setBatchSize(event.currentTarget.value)}
                />
              </Stack>
            </Grid>
          </Stack>
        </Card>
        <Card overflow="auto" padding={4} radius={3} shadow={1} style={{ maxHeight: '24rem' }}>
          <Stack space={3}>
            <Text size={2} weight="semibold">
              Activity
            </Text>
            {log.length === 0 ? (
              <Text muted size={1}>
                No activity yet.
              </Text>
            ) : (
              <Code language="text" size={1}>
                {log.join('\n')}
              </Code>
            )}
          </Stack>
        </Card>
      </Stack>
    </Box>
  )
}

export const loadTestTool = definePlugin(() => ({
  name: 'load-test-tool',
  tools: [
    {
      name: 'load-test',
      title: 'Load test',
      icon: RocketIcon,
      component: LoadTestTool,
    },
  ],
}))
