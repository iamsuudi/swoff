# Ecosystem Compatibility

Swoff operates at the **`fetch` event** + **Service Worker** layer — below the application and data-fetching layers. This makes it compatible with any web stack regardless of backend language, frontend framework, or rendering strategy.

```
Application Layer (React, Vue, Svelte, HTMX, vanilla)
  Data Fetching Layer (TanStack Query, SWR, Apollo, fetch())
    SWOFF — SW + Client (fetch interception, cache, offline)
      Browser APIs (Cache Storage, IndexedDB, fetch, push)
```

The only framework-specific surface is **view adapters** (React hooks, future Vue/Svelte). These are optional thin wrappers over `postMessage` to the SW. The core caching, offline, invalidation, and auth work without them.

## Compatible with everything

| Category | Examples | Notes |
|---|---|---|
| **Backend** | PHP, Laravel, Django, Rails, ASP.NET, Go, Java, Node | Serve `client-injector.js` as a static asset; zero backend integration needed |
| **HTML-over-wire** | HTMX, Turbo Hotwire, Unpoly, Livewire | SW caches HTML fragments by URL — body format is irrelevant |
| **SSG** | Astro, Hugo, 11ty, Jekyll | Precaches all built assets at install time; SW works even if no hydration occurs |
| **SPA frameworks** | React, Vue, Svelte, Solid, Angular, Alpine | Core SW + client utilities are plain JS; React gets generated hooks |
| **SSR meta-frameworks** | Next.js, Remix, Nuxt, SvelteKit, Analog | Intercepts `fetch()` transparently at the SW level; disable the framework's own SW. SSR-safe generated code — all modules guard browser globals, so `fetchWithCache` and hooks work in Node.js without crashing or stubbing |
| **Edge / Serverless** | Cloudflare Workers, Deno Deploy, Vercel Edge | Edge runs on CDN, Swoff runs in browser — independent layers, no conflict |
| **Islands / Resumability** | Astro islands, Qwik, Marko | SW runs in its own thread regardless of component hydration |

## Why it matters

- **TanStack Query / SWR** — in-memory state only; no SW integration, no offline writes, no push
- **Workbox** — SW only; no data fetching, auth, or framework hooks
- **Apollo Client** — GraphQL only; no SW caching
- **TanStack DB** — forces dual database management (client SQLite + server DB) with schema coupling and privacy concerns: all data persists in client-side SQLite indefinitely, including after logout. Requires schema definitions, SQLite WASM download (~800 kB), and a sync engine — effectively a distributed database system in the browser. Swoff uses the native Cache Storage API: no schemas, no WASM, no dual-DB sync, and auth data is wiped on logout.
- **Next.js / Remix** — full meta-frameworks dictating your entire architecture

Swoff is the only tool that combines SW caching, data fetching, offline writes, auth, real-time sync, and push into a single config-driven system — all framework-agnostic at the core, with optional reactive hooks per framework. It operates at the lowest possible layer (the `fetch` event), making it simpler, smaller, and more composable than any application-layer alternative.
