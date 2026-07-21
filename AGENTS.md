# AGENTS.md

Guidance for coding agents working in this repository.

## What this repo is

A proof of concept: Platformatic Gateway request deduplication protecting a self-hosted Next.js 16 app from the `router.refresh()` prefetch stampede (next.js#93210), demonstrated with real Sanity Live content. See [README.md](./README.md) for the full story and measurement methodology.

## Project structure

```
watt.json               # Watt runtime: gateway (entrypoint) + next app, metrics :9090
watt.valkey.json        # Scale-out variant: Valkey dedup storage + shared Next cache, 4 workers
apps/gateway/           # @platformatic/gateway config, dedup key, stats plugin, proxy handler
apps/next/              # Next 16 blog: next-sanity defineLive/sanityFetch, eager updateTag action
apps/studio/            # Sanity Studio (:3333) with the custom "Load test" tool
scripts/                # seed.mjs, mutate.mjs, herd.mjs, posts.mjs (shared seed data)
```

## Ports

| Port | Service                                                   |
| ---- | --------------------------------------------------------- |
| 3000 | Watt runtime: gateway entrypoint proxying the Next.js app |
| 3333 | Sanity Studio (`sanity dev`)                              |
| 9090 | Prometheus metrics (`127.0.0.1` only)                     |

## Commands

| Command                     | Purpose                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm install`              | Installs deps; pnpm downloads Node 24 automatically (`devEngines.runtime`, `onFail: download`) |
| `pnpm dev`                  | Build Next + start Watt (:3000) and Studio (:3333) together                                    |
| `pnpm dev:no-dedup`         | Same, deduplication disabled                                                                   |
| `pnpm dev:valkey`           | 4 Next workers + Valkey dedup/cache; needs a local Valkey/Redis on :6379                       |
| `pnpm build` / `pnpm start` | Production build / start Watt only (`PLT_DEDUP`, `PLT_NEXT_WORKERS` env)                       |
| `pnpm seed`                 | Seed 24 posts (needs `STUDIO_AUTH_TOKEN`; idempotent)                                          |
| `pnpm mutate`               | One publish-style patch → triggers a live refresh wave in open tabs                            |
| `pnpm herd`                 | 200 synchronized RSC requests + dedup measurement table                                        |
| `pnpm lint`                 | `oxlint --type-check` (type-aware via oxlint-tsgolint)                                         |
| `pnpm format`               | `oxfmt` (write mode); `pnpm format:check` to verify                                            |

Always run `pnpm lint` and `pnpm format` before committing.

## Production mode requirement

Always test stampede behavior against the production build (`pnpm dev` builds then starts `wattpm` in production mode). `next dev` disables automatic `<Link>` prefetching, so the regression this repo demonstrates cannot reproduce in dev mode.

The stats strip on `/blog` reads the gateway-owned `/api/stats`; reset counters with the UI button or `curl -X POST http://localhost:3000/api/stats/baseline`.

## Sanity authentication

The Studio connects to Sanity Cloud (project `ppsg7ml5`, dataset `watt` — public read, authenticated write). For cloud agents, use the injected `STUDIO_AUTH_TOKEN` secret instead of interactive login.

Navigate to the Studio with the token in the URL hash (Sanity consumes it on load and removes it from the address bar; native flow from [sanity-io/sanity#9315](https://github.com/sanity-io/sanity/pull/9315)):

```
http://localhost:3333#token=<STUDIO_AUTH_TOKEN>
```

Build the URL from the secret:

```bash
node -e "const t=process.env.STUDIO_AUTH_TOKEN; console.log('http://localhost:3333#token=' + encodeURIComponent(t))"
```

Open that URL in the browser to authenticate and land in the workspace (this Studio has a single workspace at the root — there is no `/home` or other machine-specific path). Without a token the Studio shows "Signed out". If it still shows "Signed out" after the hash was consumed, reload the page once.

Headless scripts (`pnpm seed`, `pnpm mutate`) read the same `STUDIO_AUTH_TOKEN` from the environment.

### Secret handling rules

- Never commit, print, or log `STUDIO_AUTH_TOKEN` (or any token).
- Never embed the token in documentation, code, screenshots, or PR descriptions.
- The Next.js app is tokenless by design — do not introduce `SANITY_API_READ_TOKEN` or pass the studio token to `apps/next`.

## Environment notes

- pnpm ≥ 10 required on PATH; everything else (including Node 24) is provisioned by `pnpm install`.
- `.env` files are gitignored; `.env.template` files carry only public defaults, which are also baked into the code as fallbacks — `pnpm dev` works with zero configuration.
- The Valkey profile expects a Redis-compatible server on `127.0.0.1:6379` (`docker compose up -d valkey`, or `apt-get install valkey-server` on Debian/Ubuntu).
- Do not use machine-specific paths in code or docs; everything runs relative to the repo root.

## Cursor Cloud specific instructions

- Startup layer runs `pnpm install` (provisions Node 24 automatically). It does **not** start any service — start them yourself. Standard commands live in the `## Commands` table above (`pnpm dev`, `pnpm herd`, `pnpm lint`, etc.).
- `pnpm dev` builds Next then runs Watt (gateway `:3000` + Next worker) and Studio (`:3333`) in the foreground via `concurrently`; run it in a background terminal (e.g. tmux) and tail its log. `/blog`, `/api/stats`, and the Studio all come up within ~10s.
- Live content updates only appear in an open, SanityLive-subscribed browser tab; `/blog` and `/blog/[slug]` are statically prerendered, so a headless `curl` after a publish will still show the old title. To demo the live refresh + dedup, open `/blog` in a browser and publish (Studio Load test tool, or `pnpm mutate` from a terminal).
- Token caveat (non-obvious): the repo/scripts read `STUDIO_AUTH_TOKEN`, but in this environment that injected secret returns `401 Unauthorized - Session not found`. The valid write token is the `SANITY_TEST_STUDIO_AUTH_TOKEN` secret. For authenticated writes (`pnpm seed`, `pnpm mutate`, MCP writes) export it first: `export STUDIO_AUTH_TOKEN="$SANITY_TEST_STUDIO_AUTH_TOKEN"`. Never print/log/commit either token value. Public reads (rendering `/blog`) need no token.
- `pnpm format:check` reports one pre-existing failure on the committed, Next-generated `apps/next/next-env.d.ts` (marked "should not be edited"); this is unrelated to your changes. `pnpm lint` passes (warnings only).
