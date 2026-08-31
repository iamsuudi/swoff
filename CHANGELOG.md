# Changelog

## @swoff/cli@0.5.0 (2026-08-30)

- feat: schema v2 — all cache-related features moved under `features.caching` (`strategy`, `navigation`, `precache`, `mutationQueue`, `tagInvalidation`, `graphql`, `serverPush`, `requestBatchWindowMs`, `refetchQueue`)
- feat: `$schema` now points to `https://swoff.space/schema/v2.json`; old flat keys rejected with migration hints; SW emits no fetch listener unless `caching.enabled`
- feat: dependency rules enforced — `serverPush` requires `tagInvalidation`, `backgroundSync` requires `mutationQueue`, `serverPush` unsupported with bearer/custom auth
- feat: `connectivity` is explicit opt-in; online-status shared module generated when connectivity or auth is enabled
- feat: generated configs fully explicit — every enabled feature materializes its complete subtree (booleans included), disabled optional features omitted; `strategy.reactive` only emitted when reactive is the default strategy
- feat: `build.swoffPath` defaults to `.` (resolves to `swoff/`) via `resolveSwoffPath` normalization across CLI + emitted generator
- feat: wizard rework — caching gate asked before strategy/navigation, descendants only when enabled; autoActivate prompt; backgroundSync nested under mutationQueue; serverPush chained on tagInvalidation; precacheDirs materialized with all fields
- docs: config reference with callouts, dependencies/connectivity guides, migration-v2 guide, caching interlock diagram

## @swoff/assets@0.3.0 (2026-08-29)

- feat: asset generation is now explicit-only — `--android` adds the Android adaptive launcher stack and `--splash` adds Apple splash screens (replacing the old `--no-splash` opt-out)
- feat: default output is now 13 files (icons, favicons, OG image, manifest, head tags, audit page), up to 50 with the opt-in flags
- feat: programmatic `appleSplash` and the new `android` option now default to off

## @swoff/cli@0.4.8 (2026-08-29)

- fix: generated framework adapters written via read-write transforms instead of brittle file copies — fixes a broken `realtime/notifications` import (mapped to `push-notification/index`) and normalizes module specifiers to each project's file extension
- chore: remove unused guide generator and dead `swoff add`/`swoff info` command surface

## @swoff/assets@0.2.0 (2026-08-29)

- feat: wordmark auto-generation — `--source` is now optional; omit it to generate a text-derived icon from `--app-name` (with a bitmap-font fallback when no system fonts exist)
- feat: always-on Android adaptive icons — density-scaled `ic_launcher`/`ic_launcher_round` PNGs, 66% safe-zone foreground, monochrome layer, `mipmap-anydpi-v26` launcher XMLs, and `values/colors.xml`
- feat: new `pwa-debug.html` audit page; new manifest flags `--orientation`, `--scope`, `--lang`, `--categories`; and a `--print-schema` flag exposing the `swoff-assets.json` JSON schema
- fix: invalid color hexes, undersized sources, and similar issues now produce non-fatal warnings instead of silently generating wrong output
- feat: generation counts — 36 files by default, up to 50 with monochrome, MS tiles, and dark mode

## @swoff/assets@0.1.3 (2026-07-13)

- feat: generate favicon.svg for all source types (base64 PNG embedded for raster sources)
- fix: remove narrow screenshot from manifest (OG image is 1200×630, only wide form_factor kept)
- feat: add --short-name, --description, --start-url CLI flags and config options
- feat: add id to manifest, sizes="any" to favicon.svg link tag in head output

## @swoff/cli@0.4.7 (2026-07-08)

- fix: versioned precache cache name `precache-{hash}` — cache only wiped when asset list hash changes, no empty window between old and new SW
- fix: TDZ crash (`Cannot access 'ASSETS_TO_CACHE' before initialization`) — hoist declarations before background precache section
- fix: HTTP errors (404, 5xx) now advance checkpoint; network errors (offline, timeout) keep checkpoint for retry — `fetch()` + `cache.put()` replaces `cache.add()`
- fix: legacy unversioned `"precache"` cache cleaned up on activation alongside versioned `precache-*`
- fix: add RESUME_PRECACHE listeners (visibilitychange + online) to IIFE client-injector bundle (was ESM-only)
- refactor: move precaching design rationale from guides to architecture docs
- feat: replace `navCacheOnly` config with `strategy.patterns` + `"network-only"` — reuse existing mechanism for Tier 2/3 co-existence

## @swoff/cli@0.4.6 (2026-07-06)

- refactor: eliminate duplicated feature-section logic in swoff-api-bundle by using stripModuleWrappers() to embed runtime generators directly (958 lines removed, 71 added)
- refactor: extract shared sw-build-utils.mjs to eliminate duplicated asset-scanning logic between CLI generator and no-bundler template
- refactor: content-type-aware fallback dispatch — only navigation requests get HTML fallback chain; images, scripts, API calls (etc.) return 502 instead of incorrectly serving HTML
- refactor: SSR-only pushState prefetch for SPA navigation
- feat: remove build.swFilename config option, hardcode swoff.sw.js as the service worker filename
- feat: wipe precache cache in ensurePrecacheVersion during SW activation instead of in activation handler
- fix: auto-enable feature dependencies (auth, push-notifications, pwa, mutation-queue) in buildMinimalConfig
- fix: inline prefetchCache utility and gate message handlers on feature flags to avoid unused code in bundles
- fix: warn when irrelevant flags are passed to CLI commands (--framework on generate, --yes on validate, etc.)
- fix: remove dead defaultInitConfig export

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
