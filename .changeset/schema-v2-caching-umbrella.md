---
"@swoff/cli": minor
---

Schema v2: caching features are now opt-in under a `features.caching` umbrella.

This is a **breaking** change to `swoff.config.json`:

- `features.serviceWorker.strategy`, `features.serviceWorker.navigation`, and `features.serviceWorker.precache` moved to `features.caching.{strategy,navigation,precache}`.
- `features.mutationQueue`, `features.tagInvalidation`, `features.graphql`, `features.serverPush`, `features.requestBatchWindowMs`, and `features.refetchQueue` moved under `features.caching`.
- `$schema` is now `https://swoff.space/schema/v2.json`. The old flat keys are rejected with migration hints.
- The service worker no longer intercepts fetches unless `features.caching.enabled` is `true` — a minimal SW (install + lifecycle message handling only) is generated when caching is disabled.
- Dependency rules are enforced: any effective `features.caching.*` leaf requires `features.caching.enabled`; `serverPush.enabled` requires `tagInvalidation.enabled`; `mutationQueue.backgroundSync` requires `mutationQueue.enabled`; `serverPush` is unsupported with `auth.type: "bearer"`/`"custom"`.
- `features.connectivity` is explicit opt-in (`enabled: false` by default); its runtime module and `online-status` are only generated when enabled or when `auth.enabled`.
- Generated configs are fully explicit: each enabled feature materializes its complete subtree (booleans included), disabled optional features are omitted, `strategy.reactive` is only emitted when the default strategy is `"reactive"`, and `build.swoffPath` is emitted as `"."` (same as empty — resolves to the default `"swoff"` directory).

No automated migration is provided; run `swoff init` in a scratch project or follow the migration guide in the docs.
