# AGENTS.md

Guidance for AI coding agents working in this repo. Humans welcome too.

## What this repo is

A minimal starter pinning **Nuxt 5 (nightly)** + **Nitro 3 (beta)** + **h3 v2** +
**Vercel Workflow DevKit** to verify the new stack works end-to-end. Renders an SSR
page, hits a Nitro API route, and runs a durable workflow with streaming progress.
Both Nuxt 5 and Nitro 3 are unreleased as of 2026-05-25 — expect breakage on upgrades.

## The workflow demo

- `server/workflows/demo.ts` — `demoPipeline` workflow: install → compile → test →
  deploy, each as a `"use step"` function. `sleep("1s")` / `sleep("2s")` between
  steps proves durable suspension. Each step boundary emits a `DemoEvent` to the
  default workflow stream via `getWritable<DemoEvent>()`.
- `server/api/workflow.post.ts` — `POST /api/workflow { project }` starts a run via
  `start(demoPipeline, [project])` and returns the `runId`.
- `server/api/workflow/[runId].get.ts` — `GET /api/workflow/:runId` calls
  `getRun(runId).getReadable<DemoEvent>()` and re-encodes the chunks as
  Server-Sent Events. `app.vue` consumes the SSE stream.
- `nuxt.config.ts` has `modules: ['workflow/nuxt']` — this is what registers the
  workflow endpoints with Nitro and enables the `"use workflow"` / `"use step"`
  directive transforms.

### h3 v2 + workflow docs gotcha

The Workflow DevKit Nuxt docs (`node_modules/workflow/docs/getting-started/nuxt.mdx`)
still use `defineEventHandler` from h3 v1. This stack ships h3 v2. Translate as you
go: `defineEventHandler` → `defineHandler`, and `readBody` / `getRouterParam` /
`HTTPError` are still exported. See [Nitro 3 / h3 v2](#nitro-3--h3-v2--the-api-renames-that-bite).

### Inspecting runs

```sh
npx workflow inspect runs        # list runs
npx workflow inspect run <id>    # details for one run
npx workflow web                 # open the dashboard
```

### First-deploy-on-a-lane fails — redeploy once

The very first deploy on each environment lane (preview, production) fails
`POST /api/workflow` with:

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  at JSON.parse ... at readAllBytes (undici)
```

That's the workflow runtime hitting a 404 HTML page from Vercel Queues
before the per-environment topic is provisioned. The broken first deploy
never self-heals — but every subsequent deploy on the same lane works
because the topic is now in place. **Fix: just redeploy.** After that the
lane stays healthy.

## Version pinning — read this before touching `package.json`

- `nuxt` is aliased to `nuxt-nightly` via the `5x` dist-tag:
  `"nuxt": "npm:nuxt-nightly@5x"`. Do **not** swap it to plain `nuxt` — `nuxt@latest`
  is currently 4.x and does not pull in Nitro 3.
- `nitro@3.x` is forced through npm `overrides` because the Nuxt 5 nightly's
  transitive `@nuxt/nitro-server` may resolve an older Nitro otherwise. Keep the
  override in place until Nitro 3 ships stable.
- After bumping either pin, run `npm install && npx nuxt prepare` and re-verify
  both `/` and `/api/hello` return 200. Nightly drops break things.

**Commit `package-lock.json`.** With nightly dist-tags, an unlocked install
resolves a different version on every CI run. When Vercel restores a build
cache from a prior deploy but installs *newer* nightly versions, the cached
virtual modules (e.g. `.nuxt/fetch.server.mjs`) reference imports the new
Nuxt/Nitro pair doesn't generate, and Rolldown fails to resolve `"nitro"`.
The lockfile is what stops the drift.

To check what actually got installed:

```sh
cat node_modules/nuxt/package.json   | grep -E '"(name|version)"'
cat node_modules/nitro/package.json  | grep -E '"(name|version)"'
cat node_modules/h3/package.json     | grep -E '"(name|version)"'
```

## Nitro 3 / h3 v2 — the API renames that bite

`defineEventHandler` no longer exists. h3 v2 exports:

- `defineHandler` — replaces `defineEventHandler`
- `defineMiddleware` — for `server/middleware/*.ts`
- `defineWebSocketHandler` — for WS routes
- `HTTPError`, `HTTPResponse`, `html` — utilities

Nitro re-exports these from `nitro/runtime`, but in this nightly the Nuxt-generated
Nitro auto-import file (`.nuxt/types/nitro/nitro-imports.d.ts`) is empty — i.e.
**no auto-imports for server handlers**. Until that's wired up, import explicitly:

```ts
// server/api/hello.ts
import { defineHandler } from 'h3'

export default defineHandler((event) => {
  return { ok: true }
})
```

Vue/composables side (`useFetch`, `useState`, etc.) auto-imports work normally —
this issue is server-side only.

## Build / runtime notes

- Builder is **rolldown** (default in Nitro 3), not Rollup. Watch the startup log
  line: `[nitro] ℹ Starting dev watcher (builder: rolldown, preset: nitro-dev, ...)`.
- `compatibilityDate` in `nuxt.config.ts` pins behavior; bump it deliberately, not
  reflexively.
- Node 24 LTS. Older Node may break the rolldown builder.

## Deploying to Vercel

This repo deploys cleanly to Vercel with **zero config** — no `vercel.json`,
no `vercel.ts`. Nuxt auto-detects the `vercel` Nitro preset from the build
environment and emits a `.output/` that Vercel's build pipeline consumes
directly.

What you'll see in a healthy build log:

```
●  Nuxt 5.0.0-... (with Nitro 3.0.260522-beta, Vite 8.0.14 and Vue 3.5.34)
●  Nitro preset: vercel
```

Production runtime is Node 24 LTS (Vercel's current default). Don't pin
`engines.node` lower — the rolldown builder needs modern Node.

### The build cache footgun

Vercel restores `node_modules/.cache/nuxt/` and `.nuxt/` from the previous
deploy. On a nightly stack that's dangerous: if the install resolves a
newer Nuxt/Nitro than the cached `.nuxt` was generated against, you get

```
Rolldown failed to resolve import "nitro" from
  "virtual:nuxt:.../.nuxt/fetch.server.mjs".
```

Two mitigations, in order:

1. **Keep `package-lock.json` committed.** This is the durable fix. Same
   lockfile → same nightly versions → cache stays valid.
2. If you bump nightly versions and the next deploy fails with the
   resolve error above, force one clean rebuild to flush the cache:
   `vercel deploy --prod --force` (or click "Redeploy" with "Use existing
   Build Cache" **off** in the Vercel UI). Subsequent deploys re-cache
   from the clean state.

### Verifying a deploy

```sh
curl -i https://<your-deploy>.vercel.app/            # → 200, SSR'd HTML
curl -i https://<your-deploy>.vercel.app/api/hello   # → 200, JSON from Nitro
```

If `/` works but `/api/*` 500s, it's almost always the h3 v2 rename
(`defineEventHandler` → `defineHandler`) — see the section above.

## When something breaks

1. Check the log line at startup — it prints the exact Nuxt + Nitro + Vite + Vue
   versions actually loaded. The nightly tag in `package.json` is not enough; resolution
   can surprise you.
2. If a server route throws `X is not defined`, it's almost certainly an h3 v2
   rename. Grep `node_modules/nitro/dist/runtime/nitro.mjs` for the new export name
   before guessing.
3. If `nuxt prepare` (auto-run via `postinstall`) regenerates `.nuxt/` with empty
   import declarations, that's expected for now — use explicit imports server-side.

## What NOT to do

- Don't add the legacy `nitropack` package. Nitro 3 ships as `nitro` (different
  package name).
- Don't add `@nuxtjs/*` modules without checking Nuxt 5 compatibility — most
  modules in the ecosystem still target Nuxt 3/4.
- Don't run `npm update` blindly. The pinned overrides are load-bearing.
- Don't commit `.nuxt/`, `.output/`, or `node_modules/` (gitignored, but worth saying).
