# Ecosystem Compatibility

Swoff operates at the lowest JavaScript-accessible layer in the browser — the **`fetch` event** and
**Service Worker** scope. This means it works with **any** web technology, regardless of backend
language, frontend framework, or rendering strategy.

---

## The layer model

Most libraries operate at the application layer (component tree, state management). Swoff sits
below that:

```
┌─────────────────────────────────────────────┐
│  Application Layer                          │
│  (React, Vue, Svelte, HTMX, vanilla JS)     │
├─────────────────────────────────────────────┤
│  Data Fetching Layer                        │
│  (TanStack Query, SWR, Apollo, fetch())     │
├─────────────────────────────────────────────┤
│  ╔═════════════════════════════════════════╗ │
│  ║  SWOFF — Service Worker + Client       ║ │
│  ║  (fetch interception, cache, offline)   ║ │
│  ╚═════════════════════════════════════════╝ │
├─────────────────────────────────────────────┤
│  Browser APIs                               │
│  (Cache Storage, IndexedDB, fetch, push)    │
└─────────────────────────────────────────────┘
```

Swoff intercepts at the `fetch` event — the last stop before the network. It doesn't care what
generated the request: a PHP template, an HTMX swap, a React hook, a plain `<a>` click, or a
`curl` from the browser's address bar. All HTTP requests pass through the same SW scope.

The only framework-specific surface is **view adapters** (React hooks, future Vue/Svelte hooks).
These are convenience wrappers over `postMessage` to the SW — they make reactive UI updates
smooth but are entirely optional. The core caching, offline, and invalidation work without them.

---

## Server-rendered (any backend)

PHP / Laravel / Django / Rails / ASP.NET / Go / Java

The server returns HTML. Swoff's SW caches those HTML pages for offline access.
`fetchWithCache` handles any AJAX/fetch calls the page makes. No integration needed beyond
dropping the `<script>` tag.

```html
<script src="swoff/client-injector.js"></script>
```

The backend has zero awareness of Swoff — it just serves static generated JS files alongside
its normal HTML responses.

---

## HTML-over-the-wire

HTMX / Turbo Hotwire / Unpoly / Livewire

Server returns HTML fragments via fetch. Swoff's SW caches those fragments just like any other
HTTP response. Background refresh keeps stale fragments fresh. The SW does not care whether the
response body is JSON, HTML, or plain text — it operates on cache entries by URL and headers.

---

## Static site generators

Astro / Hugo / 11ty / Jekyll

Pre-built HTML with minimal JS. Swoff precaches all built assets at install time and provides
offline support out of the box. For Astro (islands architecture), the client-side JS only runs
in hydrated components — the SW layer (caching, offline, push notifications) works regardless.

---

## SPA frameworks

React / Vue / Svelte / Solid / Angular / Alpine

Swoff's core SW caching works with all of them transparently. The client-side utilities
(`fetchWithCache`, `invalidation-tags`, `mutation-queue`) are plain JS/TS — no framework
imports needed.

**React** gets generated hooks (`useCachedFetch`, `useMutation`, `usePrefetch`, etc.) for
reactive UX. **Vue and Svelte** hooks are planned but the SW and client core work today
with any framework.

---

## SSR meta-frameworks

Next.js / Remix / Nuxt / SvelteKit / Analog / SolidStart

These frameworks use `fetch()` under the hood for client-side navigation and data fetching.
Swoff intercepts at the `fetch` event level — completely transparent to the framework.

```
Browser fetch() → SW fetch event → strategy dispatch → network
```

The only caveat: some meta-frameworks bundle their own service worker (e.g., Next.js PWA).
In that case, you disable the framework's SW and let Swoff handle it. Swoff's SW is a
drop-in replacement that covers caching, offline, background sync, push, and cross-tab sync
in a single generated file.

---

## Edge / Serverless

Cloudflare Workers / Deno Deploy / Vercel Edge Functions

Swoff runs in the **browser's** Service Worker, not the edge. These are independent layers:
- **Edge**: runs on the CDN, transforms requests/responses before they reach your origin
- **Swoff SW**: runs in the user's browser, intercepts requests after they leave the edge

Both can coexist. The edge handles auth, redirects, A/B testing; Swoff handles client-side
caching and offline. No conflict.

---

## Islands / Resumability

Astro islands / Qwik / Marko

Partial hydration means Swoff's client code only executes in hydrated components. The SW
layer (caching, offline, push) runs independently in its own thread — it does not depend
on page JavaScript executing. Even if no component hydrates, the SW still serves cached
responses and handles push events.

---

## Why this matters

Most libraries in this space lock you into a specific framework or rendering strategy:

- **TanStack Query** — works with any framework via adapters, but only manages in-memory
  state. No SW integration, no offline writes, no push.
- **Workbox** — SW only. No data fetching layer, no auth, no framework hooks.
- **Apollo Client** — GraphQL only. Requires React/Vue/Angular adapter. No SW caching.
- **Next.js / Remix** — full meta-frameworks that dictate your entire architecture.

Swoff is the only tool that:
- Operates at the **browser infrastructure layer** (SW + fetch event)
- Works with **any backend** (PHP, Python, Ruby, Go, Java, Node)
- Works with **any frontend** (React, Vue, Svelte, HTMX, vanilla)
- Works with **any rendering strategy** (SSR, SSG, SPA, islands, HTML-over-wire)
- Provides **optional view adapters** (hooks) for smooth reactive UX

The framework adapters are the only framework-specific code — and they're thin wrappers over
`postMessage` to the SW. The core (caching, offline, invalidation, auth, push) is fully
framework-agnostic.
