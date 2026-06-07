# Prefetch: Swoff vs Framework Built-Ins

Prefetch fetches resources before navigation so the response is available instantly. The key difference is where the response is stored — the SW Cache Storage API (disk-backed, survives reloads) versus in-memory framework caches (lost on navigation). Swoff is the only tool that automatically prefetches on every client-side navigation when SSR mode is enabled, with zero manual intervention.

## How Swoff does it

Swoff provides two prefetch mechanisms: manual `prefetchCache()` for any URL, and **auto-prefetch** on client-side navigation when `navigation.mode` is `"ssr"`.

**Manual prefetch — `prefetchCache(url)`:**
```ts
import { prefetchCache } from "swoff/fetch/core";

// Prefetch any URL — API, images, pages, third-party
prefetchCache("/api/todos");
prefetchCache("/about");
```

Fire-and-forget. The SW fetches the URL, caches the full HTTP response in the Cache Storage API, and silently swallows errors. Works for any content type.

**Auto-prefetch — `history.pushState` interceptor (SSR mode only):**
```js
// Generated automatically when navMode === "ssr"
const origPushState = history.pushState.bind(history);
history.pushState = function (data, unused, url) {
  origPushState(data, unused, url);
  if (typeof url === "string" && url.startsWith("/")) {
    prefetchCache(url);
  }
};
```

Every `pushState`/`replaceState` call — the mechanism every client-side router ultimately uses — triggers a prefetch of the target URL. This means:
- The user clicks a Next.js `<Link>` → router calls `pushState` → SW starts fetching the HTML page
- The user navigates via Remix `<Link>` → same chain
- Vue Router, SvelteKit, Nuxt, TanStack Router — all use `pushState` under the hood

The response is cached in the SW before the route renders. On page refresh, the HTML is available instantly from the cache.

**Key properties:**
- **Storage:** SW Cache Storage API (disk-backed, survives reloads)
- **Thread:** SW thread — invisible to the main thread, no rendering impact
- **Scope:** Any URL — not limited to route data
- **Survives hard navigation:** ✅ Cached response persists across page refreshes
- **Framework coupling:** None — intercepts at the browser API level

## How competitors handle it

**Next.js `<Link prefetch>`,` `router.prefetch()`:**
Stores route data (RSC payload, JS bundles) in an in-memory `CacheNode` tree. The data is lost on hard refresh or tab close — it only helps within a session. The prefetch is triggered by `<Link>` components entering the viewport (IntersectionObserver) or hover, but only for static paths. Dynamic routes require explicit `generateStaticParams` or manual `router.prefetch()`.

```tsx
// app/page.tsx
<Link href="/about" prefetch={true}>About</Link>

// Programmatic — only for route segments, not API data
router.prefetch("/about");
```

- **Storage:** In-memory (`CacheNode` tree) — lost on reload
- **Scope:** Route segments only — cannot prefetch API endpoints
- **Offline:** ❌ In-memory cache is wiped on navigation

**TanStack Router `router.prefetch()`:**
Loads route data into an in-memory `routeCache`, lost on hard refresh. Router-level dependency — requires importing the router instance. Prefetches route loaders only, not arbitrary URLs. No automatic prefetch on `pushState` — must be called explicitly.

```tsx
const router = useRouter();
router.prefetch("/posts/$postId", { params: { postId: "42" } });
```

- **Storage:** In-memory — lost on reload
- **Scope:** Route loaders only
- **Offline:** ❌ In-memory, no SW integration

**Remix `<Link prefetch>`,` `shouldRevalidate`:**
Remix prefetches route data into the browser HTTP cache via `<link rel="prefetch>` tags injected into the DOM. This survives reloads to some degree (respects HTTP `Cache-Control` headers), but the browser HTTP cache is not the SW cache — it cannot serve responses when the SW intercepts navigation, and it does not support Swoff's tag-based invalidation or strategy system.

```tsx
<Link to="/about" prefetch="intent" /> // On hover
<Link to="/about" prefetch="render" /> // On render
<Link to="/about" prefetch="viewport" /> // Default — on scroll into view
```

- **Storage:** Browser HTTP cache (disk-backed but SW-invisible)
- **Scope:** Route data only
- **Offline:** 🟡 Partial — depends on `Cache-Control` headers

**SvelteKit `data-sveltekit-preload-code`, `data-sveltekit-preload-data`:**
Uses a custom `data-sveltekit-preload-*` attribute on anchor tags. The framework intercepts clicks and hover events to prefetch route data into an in-memory `load_cache`. Lost on hard refresh. Limited to route-level data — no API or asset prefetching.

```html
<a href="/about" data-sveltekit-preload-data>About</a>
```

- **Storage:** In-memory (`load_cache`) — lost on reload
- **Scope:** Route data only
- **Offline:** ❌ In-memory, no SW integration

## Comparison table

| Dimension | Swoff | Next.js | TanStack Router | Remix | SvelteKit |
|---|---|---|---|---|---|
| **Storage** | SW Cache API (disk) | In-memory CacheNode | In-memory routeCache | Browser HTTP cache | In-memory load_cache |
| **Survives hard nav?** | ✅ Yes | ❌ No | ❌ No | 🟡 Per Cache-Control | ❌ No |
| **Auto-prefetch on pushState?** | ✅ Built-in (SSR mode) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Scope** | Any URL | Route data only | Route loaders only | Route data only | Route data only |
| **Offline** | ✅ Native | ❌ | ❌ | 🟡 | ❌ |
| **Thread** | SW thread | Main thread | Main thread | Main thread | Main thread |
| **Framework coupling** | None | Next.js | TanStack Router | Remix | SvelteKit |
| **Runtime cost** | 0 kB (generated) | Bundled with Next.js | Bundled with router | Bundled with Remix | Bundled with SvelteKit |
| **Manual API prefetch** | ✅ `prefetchCache("/api/todos")` | ❌ | ❌ | ❌ | ❌ |

## When to choose what

- **Choose Swoff when:** You need prefetches to survive page refreshes (Cache Storage API), you want auto-prefetch on all client-side navigation without manual `<Link prefetch>` sprinkles, or you need to prefetch API endpoints and images — not just route data.
- **Choose framework prefetch when:** You only need in-session route data caching, you don't need offline support, and you want zero additional setup beyond the framework's built-in `prefetch` attributes.
- **Choose Workbox when:** You need SW-level caching but are already using Workbox for other reasons and don't need auto-prefetch or tag-based invalidation.
- **Choose client DBs when:** You need full offline-first with synced data, schema-aware queries, and are willing to manage a dual database architecture (local + server).
