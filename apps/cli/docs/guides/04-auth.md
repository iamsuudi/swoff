# Auth-Aware Caching

> Swoff's auth layer is unique — no equivalent in general-purpose data fetching libraries. Auth headers are injected automatically into `fetchWithCache` calls, 401 responses trigger silent token refresh, and `clearAuth()` purges memory + IndexedDB + runtime caches + cross-tab in a single call.

## Preconditions

- A backend with login/logout endpoints and a session or token mechanism
- `swoff init` already run

## Enable

```bash
npx @swoff/cli add auth
```

Defaults to cookie auth (`auth.type: "cookie"`). To use bearer tokens:

```bash
# Edit swoff.config.json first, then:
npx @swoff/cli add auth
```

Or set `features.auth.enabled: true` and `features.auth.type` in `swoff.config.json` then regenerate.

## Generated files

| File                     | What it does                                                                                                                               | Import in your code?                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `swoff/auth/adapter.ts`  | Maps Swoff auth to your provider                                                                                                           | Yes — import `adapter` for type reference |
| `swoff/auth/store.ts`    | `setAuth()`, `getAuth()`, `clearAuth()`, `ensureValidAuth()`, `isAuthValid()`, `withAuthHeaders()`, `isAuthUrl()`, `AUTH_WITH_CREDENTIALS` | Yes — main auth API                       |
| `swoff/auth/state.ts`    | `getAuthState()` — 4-state matrix (online/offline × authed/unauthed)                                                                       | Yes                                       |
| `swoff/sw/auth-check.ts` | `isAuthFailureResponse()` — customize what the SW treats as auth failure                                                                   | Yes — edit this file                      |

## Usage

```ts
import { fetchWithCache } from "./swoff/fetch/core";
import {
  setAuth,
  clearAuth,
  getAuth,
  isAuthValid,
  ensureValidAuth,
} from "./swoff/auth/store";
import { getAuthState } from "./swoff/auth/state";

// After login — pass the user data from your backend
const user = await fetchWithCache("/api/me", { auth: true }).then((r) =>
  r.json(),
);
await setAuth(user);

// Authenticated requests — auth headers injected automatically
const { response } = await fetchWithCache("/api/protected", { auth: true });

// Check auth state anywhere
const { authenticated, auth, online } = await getAuthState();
// States: online+authed, online+unauthed, offline+authed, offline+unauthed

// On logout — clears memory, IDB, runtime caches, and broadcasts to other tabs
await clearAuth();
```

Bearer-only — token refresh is automatic when the SW detects a 401 on `{ auth: true }` requests:

```ts
// The SW intercepts the 401, calls adapter.refresh() silently,
// retries the original request with the new token.
// Your code just sees the successful response.
```

## Customize

### `swoff/auth/adapter.ts` — **you must edit this file**

Three methods to implement for your backend:

```ts
// getHeaders — return auth headers for fetch requests
adapter.getHeaders(auth); // cookie → {}; bearer → { Authorization: "Bearer <token>" }

// refresh — called when SW detects 401
adapter.refresh(auth); // cookie → null (server manages session); bearer → POST /api/refresh

// fetchUser — fetch current user from /api/me
adapter.fetchUser(); // return { user: data } or null
```

The `AuthData` interface is also in this file — edit the `user` type to match your backend's user shape.

### `swoff/sw/auth-check.ts` — customize auth failure detection

Default: `response.status === 401`. Override if your backend uses a different signal:

```ts
export async function isAuthFailureResponse(response) {
  // Custom header
  return response.headers.get("X-Auth-Status") === "expired";
  // Or JSON body (must clone first)
  const data = await response.clone().json();
  return data.error === "unauthorized";
}
```

## Config

```json
{
  "features": {
    "auth": {
      "enabled": true,
      "type": "cookie",
      "routePaths": [
        "/login",
        "/logout",
        "/register",
        "/api/login",
        "/api/logout",
        "/api/refresh",
        "/api/me"
      ]
    }
  }
}
```

- `auth.type` — `"cookie"` (httpOnly session cookie), `"bearer"` (token), or `"custom"`
- `auth.routePaths` — URL paths that bypass SW cache (auth endpoints must not be cached)

### Auth type vs feature compatibility

| Auth type | PWA | Mutation queue | Background sync | Server push | GraphQL |
| --------- | --- | -------------- | --------------- | ----------- | ------- |
| cookie    | ✅  | ✅             | ✅              | ✅          | ✅      |
| bearer    | ✅  | ✅             | ❌              | ❌          | ✅      |
| custom    | ✅  | ✅             | ❌              | ❌          | ✅      |

Background sync and server push require cookie auth because they run in the SW scope (no DOM, no token refresh possible).

## Related

- [Full comparison: Auth in Swoff vs none](../comparisons/auth.md)
- [Tag invalidation: invalidateByTag after auth state changes](./05-tag-invalidation.md)
- [Config reference: auth](../CONFIG.md#featuresauth)
