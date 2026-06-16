# Swoff Integration Guides

Walk through Swoff features step by step. Each guide is standalone — start with what you need, skip what you don't.

| Guide                                                        | Competitor it replaces           | What you'll integrate                                        |
| ------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------ |
| [1. Service Worker](./01-service-worker.md)                   | Workbox / Serwist                | SW lifecycle, versioning, auto-activation, navigation preload |
| [2. Caching Strategy](./02-caching-strategy.md)               | TanStack Query / SWR             | 6 strategies, patterns, reactive, timeout, eviction          |
| [3. Data Fetching & Caching](./03-data-fetching.md)           | TanStack Query / SWR             | fetchWithCache, stale-while-revalidate, prefetch             |
| [4. Navigation Caching](./04-navigation-caching.md)          | —                                | SPA/SSR navigation, preload, fallback, precache routes       |
| [5. Auth](./05-auth.md)                                       | —                                | Auth headers, 401 detection, token refresh, protected routes |
| [6. Tag Invalidation](./06-tag-invalidation.md)               | TanStack Query invalidateQueries | Auto-tags, glob patterns, cascading, cross-tab invalidation  |
| [7. GraphQL](./07-graphql.md)                                 | Apollo Client                    | Body-hash caching, operation-name auto-tags                  |
| [8. Offline Mutations](./08-offline-mutations.md)             | RxDB / PouchDB                   | Queue writes offline, replay online, background-sync         |
| [9. Push Notifications](./09-push.md)                        | Web Push API                     | Subscribe, notify, unsubscribe                               |
| [10. Server Push](./10-server-push.md)                        | Socket.io                        | SSE/WS from SW, live tag invalidation across all tabs        |
| [11. PWA Foundation](./11-pwa.md)                             | Workbox / Serwist                | Install prompt, manifest, icons, storage estimate            |

New to Swoff? Start with guides 1–2 — they're the foundation for everything else and are enabled by default after `swoff init`.
