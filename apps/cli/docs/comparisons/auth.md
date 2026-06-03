# Authentication: Swoff vs Manual Integration

Authentication in an offline-capable app involves token management, header injection, 401 detection, silent refresh, and offline user data caching. Swoff handles all of these at the SW + client layer, eliminating the need for axios interceptors, custom fetch wrappers, or third-party auth libraries.

## How Swoff does it

Swoff generates an auth system that spans the Service Worker and the client, covering the full auth lifecycle:

**Token management:**
- Three auth types: `bearer`, `cookie`, `custom` (developer-defined header injection).
- Token storage: memory-only for bearer tokens (not persisted to storage).
- Silent refresh: `ensureValidAuth()` probes the refresh endpoint before expiry and updates tokens in memory.
- `clearAuth()`: wipes tokens from memory, user cache from IndexedDB, and clears the mutation queue — no stale data persists after logout.

**Request-level integration:**
- `fetchWithCache({ auth: true })` automatically injects auth headers.
- Auth URLs (login, register, refresh, logout) bypass SW caching via `X-SW-Cache-Strategy: mutation`.
- `401` responses trigger a silent refresh attempt. On failure, `clearAuth()` runs and `sw-auth-unauthorized` fires.

**Offline user data:**
- The user profile is cached in IndexedDB for offline display.
- `getAuthState()` returns `{ authenticated, user, online }` — works offline.

**Reactive hooks:**
- `useAuth()` returns `{ authenticated, user, online, isLoading, error, setAuth, clearAuth, ensureValid }`.
- Listens for `sw-auth-state-change` events (dispatched by the SW after auth state changes).
- Listens for `online`/`offline` events for connectivity-aware state.

## How competitors handle it

**TanStack Query / SWR:** No auth layer. Developers implement their own token injection via `axios` interceptors, custom `fetch` wrappers, or a `queryFn` wrapper. 401 handling, refresh, and offline auth state are entirely the developer's responsibility.

**Workbox:** No auth layer. The SW has no knowledge of auth tokens.

**RxDB / TanStack DB:** No auth layer. The sync engine may support auth headers, but token management, refresh, and 401 detection are manual.

**Next.js / Remix:** Server-side auth (cookies, session) handled by the framework. No client-side token injection for API calls, no offline auth state, no 401 detection in the SW.

## Comparison table

| Feature | Swoff | TanStack Query | Workbox | Next.js / Remix |
|---|---|---|---|---|
| **Token injection** | ✅ `{ auth: true }` on any `fetchWithCache` | ❌ Developer wraps `queryFn` | ❌ Not supported | ❌ Server-only (cookies) |
| **Auth types** | ✅ Bearer, cookie, custom | ❌ Manual | ❌ Not supported | 🟡 Cookie/session only |
| **Silent refresh** | ✅ `ensureValidAuth()` before expiry | ❌ Developer implements | ❌ Not supported | ❌ Server-managed |
| **401 detection** | ✅ SW + client, automatic | ❌ Developer handles | ❌ Not supported | ❌ Server-managed |
| **Offline user cache** | ✅ IndexedDB (user profile available offline) | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| **Offline auth state** | ✅ `getAuthState()` works offline | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| **Logout cleanup** | ✅ Wipes tokens + user cache + mutation queue | ❌ Developer clears cache manually | ❌ Not supported | 🟡 Clears session cookie |
| **Auth-aware offline queue** | ✅ Queue respects auth: refresh before replay, stop on failure | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| **Reactive hook** | ✅ `useAuth()` with connectivity state | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| **Cross-tab auth sync** | ✅ `sw-auth-state-change` broadcast to all tabs | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| **Bundle cost** | 0 kB (generated code) | N/A (developer writes auth wrapper) | N/A | N/A |
| **Setup lines** | 0 (enabled in config) | ~20-50 lines (interceptor/ wrapper) | N/A | N/A |

## What auth at the SW layer enables

**401 detection in the SW:** When the SW intercepts a response with status `401`, it probes the user endpoint. If the endpoint also returns `401`, the token is truly expired — the SW clears auth and dispatches `sw-auth-unauthorized` to all clients. If the endpoint returns `200`, the user is authenticated but lacks permission — the original `401` propagates normally.

This means auth state is managed at the infrastructure layer, not in individual components. Every page that uses `{ auth: true }` automatically gets:
- Token injection without wrapping `fetch`.
- 401-driven logout without checking response status in every mutation.
- Cross-tab logout (close one tab → all tabs reflect the change).

**No token persistence:** Bearer tokens live only in JavaScript memory. `clearAuth()` simply deletes the reference — no storage writes, no IDB cleanup race, no token leak. The tradeoff is that a page refresh loses the token and requires a new login (or silent refresh if the refresh token is cookie-based).

## When to choose what

**Choose Swoff when:**
- You want `{ auth: true }` as a per-request flag instead of wrapping every API call
- You need offline auth state (show user profile when offline)
- You need cross-tab auth sync (logout one tab, all tabs reflect it)
- You want automatic 401 detection + silent refresh at the SW level
- You want privacy-safe logout that wipes user data from all caches

**Choose a manual approach when:**
- You need fine-grained control over token injection (e.g., per-request token rotation)
- You already have a mature auth interceptor pattern (axios interceptors, custom fetch)
- You don't need offline auth state or cross-tab sync
- Your auth is entirely server-managed (session cookies with no client tokens)
