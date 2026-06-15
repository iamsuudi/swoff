# Swoff Integration Guides

Walk through Swoff features step by step. Each guide is standalone — start with what you need, skip what you don't.

| Guide                                               | Competitor it replaces           | What you'll integrate                                        |
| --------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| [1. PWA Foundation](./01-pwa.md)                    | Workbox / Serwist                | Service worker, precaching, versioning, install prompt       |
| [2. Data Fetching & Caching](./02-data-fetching.md) | TanStack Query / SWR             | fetchWithCache, 6 strategies, stale-while-revalidate         |
| [3. Navigation Caching](./03-navigation-caching.md) | —                                | SPA/SSR navigation, preload, fallback, precache routes       |
| [4. Auth](./04-auth.md)                             | —                                | Auth headers, 401 detection, token refresh, protected routes |
| [5. Tag Invalidation](./05-tag-invalidation.md)     | TanStack Query invalidateQueries | Auto-tags, glob patterns, cascading, cross-tab invalidation  |
| [6. GraphQL](./06-graphql.md)                       | Apollo Client                    | Body-hash caching, operation-name auto-tags                  |
| [7. Offline Mutations](./07-offline-mutations.md)   | RxDB / PouchDB                   | Queue writes offline, replay online, background-sync         |
| [8. Push Notifications](./08-push.md)               | Web Push API                     | Subscribe, notify, unsubscribe                               |
| [9. Server Push](./09-server-push.md)               | Socket.io                        | SSE/WS from SW, live tag invalidation across all tabs        |

New to Swoff? Start with guide 1 and 2 — they're enabled by default after `swoff init`.
