# Offline Navigation Dominance — Proposal

## Goal

Make Swoff the definitive answer for offline navigation in any framework. Client-database libraries (RxDB, ElectricSQL, PowerSync) don't touch navigation — only the Service Worker can intercept `request.mode === "navigate"`. This is Swoff's moat.

## Current State

Swoff already leads on:

- 6-step ultimate fallback chain (runtime → precache → offline page → SPA shell → inline 503). No competitor has more than 1 step.
- Content-Type safety on navigation (`fromRuntime` rejects non-HTML).
- Framework-agnostic with auto-detection + presets (Next.js, Remix, Astro, Nuxt, SvelteKit).
- Zero runtime deps (generated code only).
- `network-first` and `spa` navigation modes.
- Route precaching via `precacheRoutes`.

## Gaps to Close

These are features competitors lack entirely. Implementing them makes Swoff unmatched.

### P0 — Per-Route Offline Fallback Pages

**Problem:** Every library has a single `navigateFallback`. You cannot serve `/blog-offline.html` for blog routes and `/dashboard-offline.html` for dashboard routes.

**Solution:** Add a `navigation.rules` array for per-route fallback configuration:

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "mode": "network-first",
        "offlineFallback": "/offline.html",
        "rules": [
          {
            "match": "/blog/*",
            "offlineFallback": "/blog-offline.html"
          },
          {
            "match": "/dashboard/*",
            "offlineFallback": "/dashboard-offline.html"
          }
        ]
      }
    }
  }
}
```

Generated in the SW as a `matchRouteFallback(url)` function that checks each rule before falling through to the global `offlineFallback`.

**Why it dominates:** No competitor has this. Workbox, Serwist, vite-plugin-pwa, next-pwa — all single fallback only.

### P0 — Navigation Policy Rules (Mode Per Route)

**Problem:** Navigation mode is global. You can't say "cache `/` and `/about` from precache, network-first for `/blog/*`, network-only for `/dashboard/*`."

**Solution:** Extend `rules` to support per-route modes:

```jsonc
{
  "navigation": {
    "mode": "default",
    "rules": [
      { "match": "/", "policy": "cache-first" },
      { "match": "/about", "policy": "cache-first" },
      { "match": "/blog/**", "policy": "network-first", "offlineFallback": "/blog-offline.html" },
      { "match": "/dashboard/**", "policy": "network-only" },
      { "match": "/notes/**", "policy": "network-first", "cacheHtml": true }
    ]
  }
}
```

Policies:
| Policy | Behavior |
|---|---|
| `cache-first` | Serve from precache immediately. Never fetch. Ideal for SSG pages. |
| `network-first` | Try network → cache on success → fallback chain. Standard SSR mode. |
| `network-only` | Always fetch from network. Never cache. For dynamic pages. |
| `stale-while-revalidate` | Serve cached instantly → fetch fresh in background → update cache. |

**Why it dominates:** No competitor has per-route navigation policies. Workbox's `NavigationRoute` is single-mode only.

### P1 — Stale-While-Revalidate Navigation Mode

**Problem:** For previously-visited SSR pages, the user waits for the network even though a cached version exists. No library implements SWR-for-navigation as a first-class feature.

**Solution:** New mode `stale-while-revalidate` for navigation:

```jsonc
{
  "navigation": {
    "mode": "stale-while-revalidate",
    "precacheRoutes": ["/", "/about"]
  }
}
```

Generated flow:
```
navigateFirst_SWR(event, request)
  → fromRuntime(request) → if found, respond instantly with cached HTML
  → _fetch(event, request) in parallel
    → if successful, cache the fresh response (user sees old version until next visit)
    → if fails, do nothing (cached version already served)
  → if no cache hit, wait for network
    → if network fails, fall through to fromPrecache → fromUltimateFallback
```

**Why it dominates:** No library implements SWR-for-navigation. Workbox explicitly advises against caching HTML long-term because of stale chunk references. Swoff can solve this by only SWR-caching pages that are in `precacheRoutes` (version-bound) or by adding a TTL.

### P1 — Smart Navigation Retry

**Problem:** When offline, the user hits a cached page or offline fallback. But when connectivity returns, they have to manually refresh.

**Solution:** Background retry with configurable intervals:

```jsonc
{
  "navigation": {
    "retry": {
      "enabled": true,
      "intervalMs": 5000,
      "maxRetries": 12,
      "serveWhenOnline": true
    }
  }
}
```

When `fromUltimateFallback` is activated, the SW starts a background retry loop. On success, it caches the response and sends a `postMessage` to the client so the page can notify the user.

**Why it dominates:** Only PowerSync has something similar for mutations (sync when online), but nothing exists for navigation.

### P2 — Navigation Fallback Analytics

**Problem:** Developers have no visibility into which routes fail offline and which fallback level is hit.

**Solution:** Generate a `useOfflineAnalytics` hook and a SW `postMessage` on each fallback activation:

```ts
// Generated hook
type OfflineEvent = {
  route: string;
  fallbackLevel: "runtime" | "precache" | "offline-page" | "spa-shell" | "inline-503";
  timestamp: number;
};

function useOfflineAnalytics(callback: (event: OfflineEvent) => void) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === "OFFLINE_FALLBACK_ACTIVATED") {
        callback(event.data.detail);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [callback]);
}
```

**Why it dominates:** No competitor provides offline analytics at all.

### P2 — Cache-First for SSG Routes

**Problem:** Routes in `precacheRoutes` are fetched at install time but the navigation mode still hits the network first. For static content, this is wasted latency.

**Solution:** When `policy: "cache-first"` is set for a route, `navigateFirst` returns the precache response immediately without network attempt.

Already covered by P0's `cache-first` policy, but worth calling out separately for SSG optimization.

## Implementation Order

### Phase 1 (P0 items — unique in ecosystem)

1. **Config schema**: Add `navigation.rules` array to `config-types.ts`
2. **Per-route fallback**: Generate `matchRouteFallback(url)` → returns the configured offline fallback URL for a given route
3. **Per-route policies**: Generate `matchRoutePolicy(url)` → returns the navigation policy for a given route
4. **Update `fromUltimateFallback`**: Call `matchRouteFallback` before the global offline fallback
5. **Update `navigateFirst`**: Dispatch per-policy (cache-first skips network, etc.)
6. **Update `generator.js`**: Include route rules in the generated SW

### Phase 2 (P1 items — differentiated)

7. **SWR navigation mode**: New `navigateFirst_SWR` handler
8. **Smart retry**: Retry loop in SW, `postMessage` on success

### Phase 3 (P2 items — quality of life)

9. **Analytics hook**: Generate `useOfflineAnalytics`
10. **Docs**: Update ECOSYSTEM.md, CONFIG.md, comparison doc

## Competitive Landscape After Implementation

| Feature | Swoff | Workbox | Serwist | vite-plugin-pwa | next-pwa |
|---|---|---|---|---|---|
| **Fallback chain depth** | 6-step | 1-step | 1-step | 1-step | 1-step |
| **Per-route fallbacks** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Per-route policies** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Content-Type safety** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **SWR for navigation** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Navigation retry** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Fallback analytics** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Framework-agnostic** | ✅ | ✅ | 🟡 | 🟡 | ❌ |
| **Zero runtime deps** | ✅ | ❌ | ❌ | ❌ | ❌ |

## Success Criteria

After Phase 1, a developer can:

1. Configure different offline fallback pages for different route patterns via a single JSON config.
2. Set different navigation policies (cache-first, network-first, network-only, SWR) for different routes.
3. Do all of this without writing a single line of SW code.
4. Do all of this without adding a runtime dependency.
5. Do all of this in any framework (Next.js, Remix, Astro, Nuxt, SvelteKit, vanilla HTML, PHP, Django, Rails).
