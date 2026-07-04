# Changelog

## @swoff/cli@0.4.5 (2026-07-04)

- fix: strip redirected flag from cached responses returned by fallback() to prevent browser rejecting event.respondWith() with a NetworkError
- feat: add precacheDirs defaults for vue, svelte, sveltekit init presets
- feat: rename `react-spa` → `react` framework name (backward-compat alias kept for existing configs)
- feat: add vike framework detection and init preset (SSR, dist/client output, Vue adapters)
- docs: add advanced precaching guide with checkpoint resume, progress, reset design
- docs: add missing build config page and fix precaching cross-links
- docs: move real-time (SSE/WS) comparison from GraphQL to Caching & Data Fetching
- docs: add cross-query GQL invalidation docs with honest tradeoff comparison vs normalized caches
- chore: consolidate all changelogs into root `CHANGELOG.md` (single source)

## @swoff/cli@0.4.4 (2026-07-04)

- feat: Vue adapters — 14 composable templates (TS + JS) for Vue, Nuxt, Quasar, VitePress
- feat: Svelte adapters — 14 store templates (TS + JS) for Svelte and SvelteKit
- feat: rename all React adapters `use*` → `useSwoff*` to avoid naming conflicts
- feat: add Quasar, VitePress to auto-detected frameworks
- feat: adapter generator supports `.ts`/`.js` templates (no JSX required)
- feat: remove `status` from `usePrecacheProgress` — only `progress` remains
- feat: make storage threshold configurable via `features.serviceWorker.strategy.storageThreshold` (default 80%)
- feat: auto-strip X-SW-\* headers in SW fetch handler to prevent leaking to external servers
- fix: use op-name derived tags for GQL mutation invalidation instead of URL-based tags (cross-query entity updates still need explicit tags)

## @swoff/cli@0.4.3 (2026-07-02)

- feat: expand framework detection to 10 new frontend frameworks (Qwik, Preact, Angular, Solid, Lit, Alpine, Marko, Stimulus, jQuery, HTMX)
- feat: start precaching immediately on SW activation instead of waiting for first fetch
- fix: remove `/ _serverFn/*=network-only` from tanstack-start-react preset
- fix: expand react-spa detection to cover react-router, @tanstack/react-location, wouter, @reach/router
- fix: no-bundler backend flavors default to navMode "default" instead of "ssr"

## @swoff/cli@0.4.1 (2026-07-02)

- feat: reliable precaching with asset version tracking and fetch-based resume
- fix: batchFailed flag prevents checkpoint advance on partial failures
- fix: wrap background precache in event.waitUntil to prevent SW termination

## @swoff/cli@0.4.0 (2026-07-01)

- refactor: rename config.build.outputDir to swOutput, add swoffPath field
- refactor: change SW generator extension from .js to .mjs
- feat: add CACHE_NAME placeholder to no-bundler SW template (fixes ReferenceError)
- feat: add excludeDirs/excludeFiles to PrecacheDirConfig for fine-grained precache control
- feat: add build.swUrl to allow custom service worker registration URL

## @swoff/cli@0.3.15 (2026-06-29)

- ci: automate npm publishing via GitHub Actions with Trusted Publisher

## @swoff/cli@0.3.14 (2026-06-22)

- Fixed `laravel` and `django` framework detection
- Added `tanstack-start-react` framework preset
- Schema validation improvements

## @swoff/cli@0.3.13 (2026-06-04)

- Initial public release
- Core features: service worker generation, 6 caching strategies, auth adapters, mutation queue, GraphQL, tag invalidation, server push, push notifications
- `@swoff/assets` PWA icon generator
- Framework adapters (React hooks)

## @swoff/assets@0.1.2 (2026-06-29)

- ci: automate npm publishing via GitHub Actions with Trusted Publisher
