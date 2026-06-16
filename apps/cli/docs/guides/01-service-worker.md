# Service Worker

Swoff generates a complete, auditable service worker from `swoff.config.json` — no manual SW code, no runtime libraries. The generated SW is a plain `.js` file you can read, debug, and commit.

## Preconditions

- Node project with `package.json`
- A `swoff.config.json` (run `npx @swoff/cli init` if you don't have one)

## Status

**Already on by default.** After `swoff init`, the SW generation pipeline is fully set up. You get the template, the build script, and the registration injector.

## How it works

Swoff splits SW generation into two phases:

### 1. Code generation (`swoff generate`)

Reads `swoff.config.json` and produces supporting files in `swoff/`:

```
swoff/
  client-injector.ts  ← Single client entry point (what you import)
  sw/
    template.js       ← SW source with config features baked in
    generator.js      ← Build script (node swoff/sw/generator.js)
    injector.ts       ← Lower-level SW registration
  config.ts           ← API_BASE for relative fetch paths
  sw/version.ts       ← SW_VERSION constant
```

The template has config features baked in (strategies, auth, tags, push handlers) but still has three placeholders for build-time values: `CACHE_NAME`, `ASSETS_TO_CACHE`, `AUTO_SKIP_WAITING`.

### 2. Build step (`node swoff/sw/generator.js`)

Run after your build. It reads the template, scans your built assets, resolves the cache name, and writes the final versioned SW:

```bash
node swoff/sw/generator.js
# Output: dist/sw-v1.2.3.js (or dist/sw.js in hash mode)
```

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "build": "your-build && node swoff/sw/generator.js"
  }
}
```

### 3. Registration

In your app entry point:

```ts
import { initServiceWorker } from "./swoff/client-injector";

initServiceWorker();
```

`client-injector` is the single client-side entry point. It calls `sw/injector` for registration, wires up the connectivity module (online/offline detection), sets up a focus listener for reactive cache refresh, and relays SW messages as DOM events (`cache-updated`, `offline-fallback`, `mutation-sync-progress`, etc.).

If you only need bare SW registration without the extras, import from `sw/injector` directly instead.

## Versioning

Three modes controlled by `features.serviceWorker.version`:

| Mode | Behavior | Cache key |
|---|---|---|
| `"package"` | Uses `version` from `package.json` | `sw-v1.2.3.js` |
| `"hash"` | Generates a random cache name per build | `sw.js` (content changes each build) |
| `"manual"` | You edit `swoff/sw/version.ts` | `sw-v{x}.js` |

```json
{
  "features": {
    "serviceWorker": {
      "version": "package",
      "autoActivate": false
    }
  }
}
```

When version changes, the new SW installs alongside the old one. On activation, the old cache is cleaned up. Set `autoActivate: true` to skip the waiting phase and activate immediately.

## What the generated SW does

The SW registers these event listeners based on your config:

| Event | Purpose |
|---|---|
| `install` | Precaches assets defined in `ASSETS_TO_CACHE` |
| `activate` | Cleans up old caches, enables navigation preload |
| `fetch` | Intercepts requests, applies caching strategies |
| `message` | Handles SKIP_WAITING, RESET_CACHE, INVALIDATE_TAG, AUTH_CLEARED |
| `push` | Displays push notifications (if enabled) |
| `sync` | Background sync for queued mutations (if enabled) |

## Cache stores

The SW uses three named caches:

| Cache constant | Purpose |
|---|---|
| `CACHE_NAME` | Precached assets — set at build time from config |
| `CACHE_NAME_RUNTIME` | Runtime-cached API responses (non-HTML) |
| `CACHE_NAME_RUNTIME_HTML` | Runtime-cached navigation responses (HTML) |

## Auto-activation

When `autoActivate: true`, the SW calls `self.skipWaiting()` after install and claims all clients on activate. Users get the new SW immediately without needing to close/reopen tabs.

## Navigation preload

When `navigation.preload: true`, the SW starts navigation requests in parallel with SW startup, shaving off a round-trip time on the first navigation after activation.

## Dev mode

When running locally without a build step, the SW falls back to `sw-dev-cache` as the cache name:

```js
if (!CACHE_NAME) CACHE_NAME = "sw-dev-cache";
```

This lets you test the SW during development without running the build script.

## Build output

The generator produces a single file:

```bash
dist/
  sw-v1.2.3.js       ← Versioned SW (sw.js in hash mode)
```

The filename changes on each version bump, so the browser naturally detects the update and installs the new SW alongside the old one.

## Config reference

```json
{
  "features": {
    "serviceWorker": {
      "version": "package",
      "autoActivate": false
    }
  }
}
```

| Field | Description |
|---|---|
| `version` | `"hash"` — random cache name per build; `"package"` — from `package.json` version; `"manual"` — edit `swoff/sw/version.ts` |
| `autoActivate` | `true` — skip waiting and activate immediately on install |

Caching strategies and navigation have their own config sections — see [Caching Strategies](./02-caching-strategy.md) and [Navigation Caching](./04-navigation-caching.md).

## Framework adapters

**React:** `useSWUpdate()` from `swoff/adapters/useSWUpdate.tsx` — exposes `{ updateAvailable, updateReady, checkForUpdate }` for showing update prompts.

```tsx
import { useSWUpdate } from "./swoff/adapters/useSWUpdate";

function SWHandler() {
  const { updateAvailable, updateReady } = useSWUpdate();
  // Show "Update available" banner when updateAvailable is true
}
```

## Related

- [Full comparison: Swoff vs Workbox / Serwist / next-pwa](../comparisons/service-worker.md)
- [Caching strategies: config patterns, 6 strategies, reactive](./02-caching-strategy.md)
- [PWA: install prompt, manifest, icons](./11-pwa.md)
- [Config reference: serviceWorker](../CONFIG.md#featuresserviceworker)
