# AGENTS.md

## Cursor Cloud specific instructions

### Current repository state

As of this writing, this repo is an **early-stage scaffold**: it contains only
`README.md`, `LICENSE`, and `.gitignore`. There is **no application code**, no
`package.json`/lockfile, and no build, lint, test, or dev-server tooling yet.
Therefore there is currently nothing to install, build, lint, test, or run.

Per the README, the intended product is a proof-of-concept exploring **Sanity
Live** on **Next.js** fronted by the **Platformatic Gateway** to mitigate
"thundering herd" request spikes.

### Toolchain available in the VM

- Node.js 22.x (via nvm), plus `npm`, `pnpm`, and `yarn`, and `corepack`.
- No project dependencies exist yet, so the startup update script is a no-op
  until a manifest is committed (see below).

### Update script behavior

The configured startup update script auto-detects a package manifest and
installs dependencies only if one is present (`pnpm-lock.yaml` → `pnpm install`,
`yarn.lock` → `yarn install`, `package-lock.json` → `npm ci`, else
`package.json` → `npm install`). With the current scaffold it does nothing.

### Once application code is added

When the Next.js app / Platformatic Gateway is committed, expect standard
scripts (e.g. `npm run dev`, `npm run lint`, `npm run build`) defined in
`package.json`; prefer the package manager matching the committed lockfile.
The Sanity integration will likely require env vars in `.env.local` such as
`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and
`SANITY_API_READ_TOKEN`. Update this section as the codebase evolves.
