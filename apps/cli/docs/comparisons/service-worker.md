# Service Worker Code Generation: Swoff vs Workbox

The Service Worker is the foundation of offline capability. The difference between Swoff and Workbox is the _code generation model_ — generated auditable source code vs a runtime library.

## How Swoff does it

Swoff generates a complete, auditable Service Worker as source code in the project's `swoff/sw/` directory. Every line is visible, editable, and committable.

```
swoff/sw/
  template.js        — SW shell: install, activate, message handling, strategy resolution
  injector.ts        — SW registration + client-side coordination
  generator.js       — Standalone Node script to rebuild template.js (run after app build)
```

**What the generated SW includes:**

1. **Strategy resolution** — The full 3-tier strategy system (per-request → route pattern → global) executes in the `fetch` event handler.
2. **Cache management** — Creates and manages named caches (`runtime-cache-v1`, `precache-v1`, etc.) with versioned cache names.
3. **Tag-based invalidation** — Receives `INVALIDATE_TAG` messages, queries the IndexedDB tag registry, clears matching cache entries, and dispatches `TAG_INVALIDATED` back to all clients.
4. **Refresh queue** — Background refetches stale URLs after invalidation, with debouncing and deduplication.
5. **Update flow** — Implicit browser-managed lifecycle. Updating the SW URL or cache name triggers automatic update. `autoActivate` controls `skipWaiting()` behavior. No user consent prompts — no `sw-update-available` event, no `acceptUpdate`/`dismissUpdate`.
6. **Navigation preload** — Enabled by default for faster navigation responses.
7. **Auth handling** — Forwards `401` detection to the client, coordinates token refresh.
8. **Cross-tab sync** — Broadcasts invalidation events to all connected clients via `self.clients.matchAll()`.

**Key properties:**

- **Auditable:** Every line of SW logic is in the project's source tree. No hidden runtime code.
- **Editable:** Developers can modify the generated SW directly for custom caching logic.
- **Committable:** The SW is part of the project's version control. CI/CD can verify it.
- **Standalone generator:** The SW template can be rebuilt independently via `node swoff/sw/generator.js` after the app build.
- **No runtime library:** The SW has zero external dependencies. Everything is generated browser-native JavaScript.

## How Workbox does it

Workbox is a runtime library that provides SW modules imported into a developer-written SW file:

```js
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  ({ url }) => url.pathname.startsWith("/api"),
  new StaleWhileRevalidate({ cacheName: "api-cache" }),
);
```

**Key properties:**

- **Runtime modules:** Each feature (precaching, routing, strategies, background sync) is a separate npm package (~30 kB total).
- **Build-time manifest:** `workbox-webpack-plugin` or `vite-plugin-pwa` generates the precache manifest of static assets.
- **Developer-written SW:** The developer writes the SW configuration as code, not as a config file.
- **Versioning:** Manual cache version management via cache names.
- **No tag invalidation:** Workbox has no built-in tag-based cache invalidation, no IndexedDB tag registry, and no cross-tab synchronization.
- **No auth handling:** Workbox does not handle auth headers, token injection, or 401 detection.

## Comparison table

| Feature                      | Swoff (generated)                                                       | Workbox                          | vite-plugin-pwa           |
| ---------------------------- | ----------------------------------------------------------------------- | -------------------------------- | ------------------------- |
| **Code model**               | Generated auditable source                                              | Runtime modules (npm)            | Wraps Workbox             |
| **Bundle size (SW)**         | ~15 kB generated                                                        | ~30 kB runtime                   | ~35 kB (Workbox + plugin) |
| **Runtime deps in SW**       | None                                                                    | workbox-\* packages              | workbox-\* packages       |
| **SW in version control**    | ✅ Yes — committed source                                               | ❌ node_modules                  | ❌ node_modules           |
| **CI/CD verifiable**         | ✅ Yes — diffable in PRs                                                | ❌ Obscured in node_modules      | ❌ Obscured               |
| **Caching strategies**       | 6 (cache-first, network-first, SWR, cache-only, network-only, reactive) | 5 (no reactive)                  | 5 (same as Workbox)       |
| **3-tier config resolution** | ✅ Per-request → route pattern → global                                 | 🟡 2-tier (route → global)       | 🟡 2-tier                 |
| **Tag invalidation**         | ✅ URL-derived + custom + cascading + glob                              | ❌ Not supported                 | ❌ Not supported          |
| **Tag registry (IDB)**       | ✅ urls→tags, tags→urls                                                 | ❌ Not supported                 | ❌ Not supported          |
| **Refresh queue**            | ✅ Debounced, deduplicated, IDB-persisted                               | ❌ Not supported                 | ❌ Not supported          |
| **Navigation preload**       | ✅ Generated by default                                                 | ✅ Manual configuration          | ✅ Manual configuration   |
| **Background sync**          | ✅ Built-in (SW + client)                                               | 🟡 Via `workbox-background-sync` | 🟡 Same                   |
| **Auth handling**            | ✅ Token injection, 401, refresh                                        | ❌ Not supported                 | ❌ Not supported          |
| **Cross-tab sync**           | ✅ SW broadcasts to all clients                                         | ❌ Not supported                 | ❌ Not supported          |
| **Update flow**              | ✅ Implicit (browser-managed, no user consent)                         | ✅ Runtime update handling       | ✅ Same as Workbox        |
| **Config-driven**            | ✅ swoff.config.json                                                    | ❌ Code-based                    | 🟡 Vite plugin config     |
| **Standalone rebuild**       | ✅ `node sw/generator.js`                                               | ❌ Requires build tool plugin    | ❌ Requires Vite          |

## What generated code means for debugging

With Workbox, the SW logic is a black box. When debugging offline behavior:

- The SW file in the browser's DevTools shows minified or transpiled runtime code.
- The actual caching logic is distributed across `workbox-strategies`, `workbox-routing`, `workbox-core`, etc.
- Modifying the SW requires understanding Workbox's module system and the custom SW file the developer wrote.
- The SW in production differs from the SW in development (build-time manifest, different caching modes).

With Swoff, the SW file in `swoff/sw/template.js` is the exact code running in the browser. The developer can:

- Read the full `fetch` event handler in their editor.
- Set breakpoints in the generated code via DevTools.
- Modify the SW directly and rebuild with `node sw/generator.js`.
- Diff SW changes in PRs.

## When to choose what

- **Choose Swoff when:** You want a fully auditable, committable SW with zero runtime dependencies, 6 caching strategies, tag-based invalidation, and a config-driven setup. You want to debug the SW by reading generated source code — not stepping through minified Workbox modules.
- **Choose Workbox when:** You need a battle-tested SW toolkit with extensive community support, you're comfortable writing and maintaining the SW configuration as code, and you don't need tag invalidation, auth handling, generated client hooks, or cross-tab sync.
- **Choose Serwist/next-pwa when:** You're building a Next.js app and need a quick SW setup with basic offline support. Accept the ~30-35 kB runtime cost and the loss of framework flexibility.
