# Changelog

## 0.4.2 (2026-07-02)

- feat: expand framework detection to 10 new frontend frameworks (Qwik, Preact, Angular, Solid, Lit, Alpine, Marko, Stimulus, jQuery, HTMX)
- feat: start precaching immediately on SW activation instead of waiting for first fetch
- fix: remove /_serverFn/*=network-only from tanstack-start-react preset
- fix: expand react-spa detection to cover react-router, @tanstack/react-location, wouter, @reach/router
- fix: no-bundler backend flavors default to navMode "default" instead of "ssr"

## 0.4.1 (2026-07-02)

- feat: reliable precaching with asset version tracking and fetch-based resume
- fix: batchFailed flag prevents checkpoint advance on partial failures
- fix: wrap background precache in event.waitUntil to prevent SW termination

## 0.4.0 (2026-07-01)

- refactor: rename config.build.outputDir to swOutput, add swoffPath field
- refactor: change SW generator extension from .js to .mjs
- feat: add CACHE_NAME placeholder to no-bundler SW template (fixes ReferenceError)
- feat: add excludeDirs/excludeFiles to PrecacheDirConfig for fine-grained precache control
- feat: add build.swUrl to allow custom service worker registration URL

## 0.3.15 (2026-06-29)

- ci: automate npm publishing via GitHub Actions with Trusted Publisher

## 0.3.14 (2026-06-22)

- Fixed `laravel` and `django` framework detection
- Added `tanstack-start-react` framework preset
- Schema validation improvements

## 0.3.13 (2026-06-04)

- Initial public release
- Core features: service worker generation, 6 caching strategies, auth adapters, mutation queue, GraphQL, tag invalidation, server push, push notifications
- @swoff/assets PWA icon generator
- React hooks adapters
