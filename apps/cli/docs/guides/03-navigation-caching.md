# Navigation Caching

How Swoff handles page navigation — SPA pushState, SSR server-rendered routes, and offline fallback.

## Preconditions

- Swoff initialized with a service worker controlling the page

## Status

**Already on by default.** After `swoff init`, navigation mode is `"spa"` with preload enabled. The SW intercepts navigation requests and serves cached or fallback content when offline.

## Generated files

No user-facing generated files for navigation. All behavior is configured through `swoff.config.json`. The SW reads navigation settings from config headers.

## Config

```json
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "mode": "spa",
        "preload": true,
        "fallback": "/offline",
        "precacheRoutes": [],
        "rules": []
      }
    }
  }
}
```

### Navigation modes

| Mode        | When to use                                         | What the SW does                                                                                                                              |
| ----------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `"spa"`     | Single-page app (React, Vue, Svelte)                | Intercepts all navigation, serves the app shell (root HTML), lets client-side router handle the route. If the shell is cached, works offline. |
| `"ssr"`     | Server-rendered app (Next.js pages, Laravel, Rails) | Attempts network for every navigation. Falls back to cache (precached routes) or the configured fallback page when offline.                   |
| `"default"` | Static sites, mixed content                         | Lets the browser handle navigation normally. Only intercepts URLs that match explicit precache rules.                                         |

### Navigation preload

When `preload: true`, the SW starts the navigation request in parallel with SW startup, shaving ~RTT off the first navigation after SW activation. The SW still gets a chance to respond — the preloaded response is a fallback.

### Fallback

`fallback` — which HTML page to serve when offline and the route isn't cached. Typically `/offline.html`. Empty string means no fallback (browser shows its own offline page).

### Precache routes

`precacheRoutes` — array of URL paths to precache during SW install. These are fetched and cached immediately so they work offline from the first visit:

```json
"precacheRoutes": ["/", "/about", "/offline"]
```

### Rules

`rules` — per-route navigation behavior overrides:

```json
"rules": [
  { "match": "/api/*", "fallback": "/offline-api" },
  { "match": "/admin/*", "fallback": "/login" }
]
```

## Related

- [Data fetching & caching: strategy patterns, staleTime, refetch](./02-data-fetching.md)
- [Config reference: navigation](../CONFIG.md#featuresserviceworkernavigation)
