# Changelog

## 0.3.15 (2026-06-29)

- Interactive init wizard with `@clack/prompts`
- Flattened `reactive.defaults` → `reactive` in config
- Minimal config output (only non-default values)
- `precache.delayMs` configuration option
- Resume triggers for background precache (visibilitychange, online events)
- Fixed `precache.concurrency` always being 1
- Fixed CACHE_NAME double-declaration in generated SW
- Fixed CLI/Docs mismatches (removed unimplemented flags)
- Expanded getting-started documentation
- Config schema v1.json updated for minimal config philosophy

## 0.3.14

- Fixed `laravel` and `django` framework detection
- Added `tanstack-start-react` framework preset
- Schema validation improvements

## 0.3.13

- Initial public release
- Core features: service worker generation, 6 caching strategies, auth adapters, mutation queue, GraphQL, tag invalidation, server push, push notifications
- @swoff/assets PWA icon generator
- React hooks adapters
