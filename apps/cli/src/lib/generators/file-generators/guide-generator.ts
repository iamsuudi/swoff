/**
 * Generates GUIDE.md — full integration guide for enabled features.
 */

import { GeneratorContext, writeFile } from "./context.js";

function tagInvalidationEnabled(config: { features: { tagInvalidation: unknown } }): boolean {
  const ti = config.features.tagInvalidation;
  return typeof ti === "boolean" ? ti : (ti as { enabled: boolean })?.enabled ?? false;
}

export function generateGuide(ctx: GeneratorContext): void {
  const { config } = ctx;
  const ext = ctx.ext;
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);
  const wb = (s: string) => lines.push("", s);

  w("# Swoff Integration Guide");
  w("");
  w("This guide explains every file and feature Swoff generated for your project.");
  w("Each section answers: **What is it?**, **What files were created?**, **How to use it?**, **Where to edit?**");
  w("");

  // ── SW Registration ──
  wb("## 📦 Service Worker Registration");
  w("The service worker handles caching, offline support, background sync, and PWA installability.");
  w("");

  w("### `client-injector.ts` — Single entry point");
  w("This is the **only file you need to import** at app startup to enable all Swoff features.");
  w("```ts");
  w(`import { initServiceWorker } from "./swoff/client-injector.${ext}";`);
  w("initServiceWorker();");
  w("```");
  w("It wires together: SW registration, PWA install prompt, mutation queue online listener, and cross-tab sync.");
  w("");

  w("### `sw/injector.ts` — SW registration logic");
  w("Handles registering the service worker, checking for updates via version.json, and dispatching");
  w("update-available / ready / error events on the window.");
  w("");
  w("**Functions:**");
  w("- `initServiceWorker()` — registers the SW and checks for updates");
  w("- `handleUpdateApproved(version)` — accepts a pending update and reloads on activation");
  w("- `skipWaiting()` — activates a waiting SW without reloading");
  w("");

  // ── Stale Time & Auto-Refresh ──
  wb("## ⏱️ Stale Time — fresh vs stale data");
  w("`staleTime` controls how long cached data is considered **fresh** before it becomes **stale**.");
  w("When data is fresh, the SW serves it immediately from cache — no network request.");
  w("When data is stale, the SW serves the cached copy but triggers a **background refresh**,");
  w("so the next read returns fresh data.");
  w("");
  w("StaleTime keeps the entry usable while silently refreshing it — the user never sees a loading spinner.");
  w("");
  w("**3-tier staleTime resolution (like strategies):**");
  w("1. **Per-request** — `fetchWithCache(url, { staleTime: 30 })` overrides everything");
  w("2. **Route pattern** — `\"/api/*\": { staleTime: 60 }` in `swoff.config.json`");
  w("3. **Global default** — `features.serviceWorker.staleTime`");
  w("");
  w("**How staleTime changes each strategy:**");
  w("| Strategy | Fresh data (within staleTime) | Stale data (past staleTime) |");
  w("|----------|------------------------------|----------------------------|");
  w("| `cache-first` | Serve from cache, no network | Serve from cache + background refresh |");
  w("| `network-first` | Serve from cache, skip network | Try network first, fall back to cache |");
  w("| `stale-while-revalidate` | Serve from cache, no refresh | Serve + background refresh (was always-refresh) |");
  w("| `cache-only` | Serve from cache | Serve from cache + best-effort refresh |");
  w("| `network-only` | No effect | No effect |");
  w("");

  // ── Online Refetch ──
  wb("## 🔄 Online refetch — recover stale cache after connectivity loss");
  w("When the browser fires the `online` event, `client-injector` forwards it to the SW.");
  w("The SW iterates its runtime cache and refetches any stale entries (batched & rate-limited).");
  w("This is the only refetch trigger — no window focus, no intervals, no polling.");
  w("");

  if (ctx.frameworkName === "react") {
    w("### React Hook: `useMutation`");
    w("Track mutation state (loading, error, success) per-operation.");
    w("```tsx");
    w(`import { useMutation } from "./swoff/hooks/useMutation.${ext}x";`);
    w("");
    w('const { mutate, isLoading, isError, isSuccess, data, error, reset } = useMutation({');
    w("  onSuccess: (data) => console.log('done', data),");
    w("  onError: (err) => console.error('failed', err),");
    w("});");
    w("");
    w('mutate("/api/todos", { method: "POST", body: JSON.stringify({ title: "New" }) });');
    w("```");
    w("");

    w("### React Hook: `usePrefetch`");
    w("Warm the cache proactively, e.g., on link hover.");
    w("```tsx");
    w(`import { usePrefetch } from "./swoff/hooks/usePrefetch.${ext}x";`);
    w("");
    w("const prefetch = usePrefetch();");
    w('return <a onMouseEnter={() => prefetch("/api/todos")} href="/todos">Todos</a>;');
    w("```");
    w("");
  }

  // ── Fetch Wrapper ──
  wb("## 🌐 fetchWithCache — API calls with caching");
  w("A drop-in replacement for `fetch()` that communicates with the service worker about caching strategy.");
  w("GET requests are cached by the SW for offline access; POST/PUT/DELETE pass through.");
  w("");
  w("**Important:** Use `fetchWithCache` for all API calls — it sets the `X-SW-Cache-Strategy` header that");
  w("the SW uses to determine whether to apply a caching strategy. Plain `fetch()` works for uncached requests,");
  w("but if `cacheStrategy` is set to `\"explicit-only\"`, the SW will skip plain `fetch()` calls entirely.");
  w("");

  w("### `fetch-wrapper.ts`");
  w("```ts");
  w(`import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
  w("");
  w("// GET — cached for offline");
  w('const todos = await fetchWithCache("/api/todos").then(r => r.json());');
  w("");
  w("// POST — passes through to server");
  w("await fetchWithCache(\"/api/todos\", {");
  w('  method: "POST",');
  w('  body: JSON.stringify({ title: "New task" }),');
  w("});");
  w("```");
  w("");

  w("**Functions:**");
  w("- `fetchWithCache(input, options?)` — main fetch wrapper. Use for all API calls.");
  w("- `fetchWithCache(input, options?)` — unified fetch wrapper. Auto-queues writes when offline (disable with `queueOffline: false`).");
  w("");
  w("**Returns** `{ response: Response, fromCache: boolean }` — `fromCache` lets the UI show stale indicators when a stale-while-revalidate fallback is served.");
  w("");

  w("**Note:** For authenticated requests, pass `{ auth: true }` — there is no separate auth fetch wrapper.");
  w("");

    if (ctx.frameworkName === "react") {
      w("### React Hook: `useCachedFetch`");
      w("Re-fetches automatically when the SW invalidates related cache tags.");
      w("```tsx");
      w(`import { useCachedFetch } from "./swoff/hooks/useCachedFetch.${ext}x";`);
      w("");
      w('const { data, error, loading, refetch } = useCachedFetch<Todo[]>("/api/todos");');
      w("```");
      w("");
      w("**Returns** `{ data: T | null, error, loading, refetch }` — `data` is the parsed JSON response.");
      w("");
      w("The hook listens for `cache-invalidated` events (when tag invalidation is enabled) and automatically");
      w("re-fetches if the event's tags match the URL. Call `refetch()` to manually refresh.");
      w("");

      w("### Dependent queries");
      w("Use `enabled: false` or pass a nullable URL to skip fetching until a condition is met.");
      w("When `enabled` becomes `true` or the URL becomes non-null, the query automatically starts fetching.");
      w("```tsx");
      w('const { data: user } = useCachedFetch<User>("/api/me");');
      w('const { data: posts } = useCachedFetch<Post[]>(user ? "/api/posts" : null);');
      w("// or");
      w('const { data: posts2 } = useCachedFetch<Post[]>("/api/posts", { enabled: !!user });');
      w("```");
      w("");

      w("### Query cancellation (AbortController)");
      w("`fetchWithCache` integrates with the dedup map so duplicate requests are automatically deduplicated.");
      w("Pass an AbortSignal to cancel an in-flight request:");
      w("```tsx");
      w("useEffect(() => {");
      w("  const ctrl = new AbortController();");
      w('  fetchWithCache("/api/search", { signal: ctrl.signal });');
      w("  return () => ctrl.abort();");
      w("}, [query]);");
      w("```");
      w("");

      w("### React Hook: `useNetworkStatus`");
      w("Tracks online/offline state reactively.");
      w("```tsx");
      w(`import { useNetworkStatus } from "./swoff/hooks/useNetworkStatus.${ext}x";`);
      w("");
      w("const online = useNetworkStatus();");
      w("```");
      w("");
      w("**Returns** `boolean` — `true` when online, `false` when offline.");
      w("");
    }

  // ── Cache Strategy Resolution ──
  wb("## 🎯 Cache Strategy Resolution");
  w("The SW uses a 3-tier priority system to determine which caching strategy applies to each request:");
  w("");
  w("1. **Per-request override (highest)** — set `strategy` on `fetchWithCache()`.");
  w("   Sent as `X-SW-Strategy` header to the SW.");
  w("2. **URL pattern match** — configured in `swoff.config.json` under `features.serviceWorker.strategies`.");
  w("   e.g. `\"/api/*\": \"network-first\"` matches all paths starting with `/api/`.");
  w("3. **Default (lowest)** — `features.serviceWorker.defaultStrategy` (default: `\"cache-first\"`).");
  w("");
  w("### Cache strategy mode");
  w("The `features.serviceWorker.cacheStrategy` option controls when strategies are invoked:");
  w("");
  w("- `\"all\"` (default): every GET/HEAD request goes through strategy dispatch, including plain `fetch()` calls.");
  w("- `\"explicit-only\"`: only requests with an `X-SW-Cache-Strategy` header (set automatically by `fetchWithCache()`)");
  w("  are processed by the SW strategy system. Plain `fetch()` calls pass through unmodified.");
  w("");
  w("### Request dispatch flow");
  w("Each GET/HEAD request follows this path through the SW:");
  w("");
  w("```");
  w("navigation (SPA fallback) → precache check → strategy dispatch → network pass-through");
  w("```");
  w("");
  w("### Available strategies");
  w("");
  w("| Strategy | Behavior (without staleTime) | Behavior (with staleTime) | Best for |");
  w("|----------|------------------------------|---------------------------|----------|");
  w("| `cache-first` | Return cached if available, else fetch + cache. Default | Fresh: pure cache. Stale: cache + bg refresh | Static assets, images, fonts |");
  w("| `network-first` | Try network, cache on success, fall back to cache | Fresh: pure cache (skip network!). Stale: try network | API endpoints, dynamic content |");
  w("| `stale-while-revalidate` | Return cached immediately, refresh in background | Fresh: pure cache (no refresh). Stale: cache + bg refresh | Fast UI, non-critical data |");
  w("| `cache-only` | Serve from cache only (404 if missing) | Fresh: pure cache. Stale: cache + best-effort refresh | Offline-critical assets |");
  w("| `network-only` | Always fetch, never cache | No effect | Sensitive or real-time data |");
  w("");

  // ── GraphQL ──
  if (config.features.graphql.enabled) {
    wb("## ⚡ GraphQL");
    w("Swoff brings caching, offline queue, auth, and tag-based invalidation to GraphQL APIs via `fetchWithGql`. It hashes");
    w("the query + variables into a deterministic cache key (`X-SW-Cache-Key`) for SW-level caching, and auto-generates");
    w("tags from operation names for automatic cache invalidation after mutations.");
    w("");

    w("### `gql-wrapper.ts`");
    w("```ts");
    w(`import { queryGql, mutateGql } from "./swoff/gql-wrapper.${ext}";`);
    w("");
    w("// Query — cached with body-hash key");
    w('const { data } = await queryGql("{ todos { id title } }");');
    w("");
    w("// Query with variables");
    w('const { data: todo } = await queryGql(');
    w('  "query GetTodo($id: ID!) { todo(id: $id) { id title } }",');
    w('  { id: "42" },');
    w(");");
    w("");
    w("// Mutation — auto-invalidates 'todos' cache");
    w('const { data: created } = await mutateGql(');
    w('  "mutation CreateTodo($title: String!) { createTodo(title: $title) { id } }",');
    w('  { title: "New task" },');
    w(");");
    w("");
    w("// With auth and custom tags");
    w('const { data, fromCache } = await queryGql(');
    w('  "query Me { me { name } }",');
    w("  {},");
    w('  { auth: true, tags: ["users"] },');
    w(");");
    w("```");
    w("");

    w("**How it works:**");
    w("- Queries are POSTed as `type: \"read\"` with `X-SW-Cache-Key: gql:<sha256-hash>`");
    w("- The SW caches responses under a virtual URL (`/__swc/gql:<hash>`) so different queries never collide");
    w("- Mutations are POSTed as `type: \"mutation\"` — auto-invalidate tags from operation name");
    w("- Offline mutations are queued via the mutation queue (if enabled)");
    w("- Auth, strategy override, and custom tags work the same as `fetchWithCache`");
    w("");

    w("**Functions:**");
    w("- `fetchWithGql<T>(query, options?)` — core GQL fetch with all Swoff features");
    w("- `queryGql<T>(query, variables?, options?)` — shorthand for queries");
    w("- `mutateGql<T>(mutation, variables?, options?)` — shorthand for mutations");
    w("");

    w("**Config:**");
    w("```json");
    w('"graphql": { "enabled": true, "endpoint": "/graphql" }');
    w("```");
    w("");
  }

  // ── Mutation Queue ──
  if (config.features.mutationQueue.enabled) {
    wb("## 📝 Mutation Queue — offline writes that sync when back online");
    w("When the user is offline and performs a write (POST/PUT/PATCH/DELETE), `queueMutation` stores it");
    w("in IndexedDB. When the connection returns, `processMutationQueue` replays them in order.");
    w("");
    w("**Configurable batching:** set `batchSize`, `batchDelayMs`, `maxRetries`, and `retryBackoffMs` in `swoff.config.json` under `features.mutationQueue`.");
    w("- `batchSize` (default 1) — mutations per progress event");
    w("- `batchDelayMs` (default 0) — delay between mutations (rate limiting)");
    w("- `maxRetries` (default 5) — max attempts before dropping");
    w("- `retryBackoffMs` (default 1000) — exponential backoff base (nextRetry = backoff × 2^retryCount)");
    w("");

    w("### `mutation-queue.ts`");
    w("```ts");
    w(`import { queueMutation, processMutationQueue, flushMutations, getPendingCount } from "./swoff/mutation-queue.${ext}";`);
    w("");
    w("// Queue an offline write");
    w("await queueMutation({");
    w('  method: "POST",');
    w('  url: "/api/todos",');
    w('  body: { title: "Grocery" },');
    w('  tags: ["todos"],');
    w("});");
    w("");
    w("// Flush after re-login (mutations queued while offline may fail with 401)");
    w("await flushMutations();");
    w("```");
    w("");

    w("**Functions:**");
    w("- `queueMutation(mutation)` — store a write for later sync");
    w("- `processMutationQueue()` — replay all queued writes. Respects batchDelayMs, maxRetries, retryBackoffMs.");
    w("- `flushMutations()` — same as processMutationQueue. Call after re-login.");
    w("- `getPendingCount()` — number of mutations waiting to sync.");
    w("");

    if (config.features.backgroundSync) {
      w("### `background-sync.ts` — Sync even after tab close");
      w("Uses the Background Sync API to register a sync event so mutations are processed even if the user");
      w("closes the tab. Falls back to the `online` event listener in unsupported browsers (Firefox, Safari).");
      w("```ts");
      w(`import { syncWhenPossible } from "./swoff/background-sync.${ext}";`);
      w("await syncWhenPossible({ method: \"POST\", url: \"/api/todos\", body: { ... } });");
      w("```");
      w("");

      w("**Functions:**");
      w("- `syncWhenPossible(mutation)` — queue and register background sync");
      w("- `retrySync()` — re-register sync if mutations are still pending (called automatically)");
      w("");

      w("> ⚠️ Background Sync is Chrome/Edge only. Not supported in Firefox or Safari.");
      w("");

      if (ctx.frameworkName === "react") {
        w("### React Hook: `useBackgroundSync`");
        w("Reactive background sync state and trigger.");
        w("```tsx");
        w(`import { useBackgroundSync } from "./swoff/hooks/useBackgroundSync.${ext}x";`);
        w("");
        w('const { supported, registered, lastSync, triggerSync } = useBackgroundSync();');
        w("```");
        w("");
        w("**Returns** `{ supported, registered, lastSync, triggerSync }` — `triggerSync()` calls `syncWhenPossible()`.");
        w("");
      }
    }

  }



  // ── Auth ──
  if (config.features.auth.enabled) {
    wb("## 🔐 Auth — token management and authenticated requests");
    w("Swoff's auth module manages authentication state with a **memory-only token** (never persisted to");
    w("IndexedDB) and optional offline user info caching.");
    w("");

    const authType = config.features.auth.type;
    w(`Auth type: **${authType}**`);
    w("");

    if (authType === "bearer") {
      w("> ⚠️ The Bearer token lives **in memory only** and is cleared on page refresh.");
      w("> Only `{ user, expiresAt }` is persisted to IndexedDB for offline user display.");
      w("> After a page refresh, re-login is required. Use the `refreshPath` for token refresh.");
      w("");
    }

    w("### `auth/store.ts` — Token and user persistence");
    w("```ts");
    w(`import { setAuth, getAuth, clearAuth, isAuthValid, createAuthFromResponse } from "./swoff/auth/store.${ext}";`);
    w("");
    w("// After successful login, store auth data");
    w("await setAuth({ token, user, expiresAt });");
    w("");
    w("// Check if still authenticated");
    w("const auth = await getAuth();");
    w("if (!isAuthValid(auth)) { /* redirect to login */ }");
    w("```");
    w("");

    w("**Where to edit:**");
    w("- `createAuthFromResponse(response)` — **edit this** to match your backend's login response shape.");
    w("");

    w("**Functions:**");
    w("- `setAuth(authData)` — store in memory + persist user to IndexedDB");
    w("- `getAuth()` — get from memory (or IndexedDB after refresh)");
    w("- `clearAuth()` — clear everything (call on logout/401)");
    w("- `isAuthValid(auth)` — check expiry");
    w("- `createAuthFromResponse(response)` — extract AuthData from login response. **Edit this.**");
    w("");

    w("### Authenticated API calls with fetchWithCache");
    w("Use `fetchWithCache` with `auth: true` for all authenticated requests — no separate auth fetch needed.");
    w("```ts");
    w(`import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
    w(`import { ensureValidAuth } from "./swoff/auth/store.${ext}";`);
    w("");
    w("// Authenticated GET");
    w('const { response } = await fetchWithCache("/api/me", { auth: true });');
    w('const user = await response.json();');
    w("");
    w("// Authenticated POST (mutation)");
    w('await fetchWithCache("/api/todos", {');
    w('  method: "POST",');
    w('  body: JSON.stringify({ title: "New" }),');
    w('  auth: true,');
    w("});");
    w("```");
    w("");
    w("**Functions:**");
    w("- `fetchWithCache(input, options)` — pass `{ auth: true }` for auth headers, cache bypass for auth endpoints, and 401 handling.");
    w("- `ensureValidAuth()` — check expiry and refresh token if needed (uses refreshPath from config).");
    w("");
    w("**Where to edit:**");
    w("- The `isAuthUrl` function in `auth/store.ts` lists auth endpoints that bypass the SW cache. Edit this list if your backend uses different paths.");
    w("- If your auth type is `custom`, edit the `withAuthHeaders` function in `auth/store.ts`.");
    w("");

    w("### `auth/user.ts` — User data caching");
    w("```ts");
    w(`import { fetchCurrentUser, getCachedUser, cacheUser, clearCachedUser } from "./swoff/auth/user.${ext}";`);
    w("");
    w("// Fetch and cache the current user");
    w("const user = await fetchCurrentUser();");
    w("```");
    w("");

    w("**Functions:**");
    w("- `fetchCurrentUser()` — fetch from user endpoint and cache in IndexedDB");
    w("- `getCachedUser()` — load user from IndexedDB (available offline)");
    w("- `cacheUser(user)` — persist user object manually");
    w("- `clearCachedUser()` — remove user from cache (call on logout)");
    w("");

    w("### `auth/state.ts` — Auth state detection");
    w("Detects which of the 4 states the app is in: online+authenticated, online+unauthenticated, offline+authenticated, offline+unauthenticated.");
    w("```ts");
    w(`import { getAuthState } from "./swoff/auth/state.${ext}";`);
    w('const { authenticated, user, online } = await getAuthState();');
    w("```");
    w("");

    if (ctx.frameworkName === "react") {
      w("### React Hooks");
      w("- `useAuth()` — returns `{ authenticated, user, online }`, listens to online/offline/auth changes");
      w("- `useCachedFetch(url, options?)` — fetches with auto-refetch on tag invalidation, see Fetch Wrapper section");
      w("- `useNetworkStatus()` — returns `boolean`, standalone online/offline tracker, see Fetch Wrapper section");
      w("");
    }
  }

  // ── Tag Invalidation ──
  if (tagInvalidationEnabled(config)) {
    wb("## 🏷️ Tag Invalidation — keep cached data fresh");
    w("When data changes on the server, cached responses in the SW become stale. Tag invalidation");
    w("marks related cache entries as stale so they're re-fetched on next request.");
    w("");

    w("### How it works (end-to-end)");
    w("1. **Tag on read** — `fetchWithCache` automatically attaches tags to outgoing requests");
    w("   via the `X-SW-Cache-Tags` header. The SW stores `url → tags[]` in IndexedDB.");
    w("2. **Invalidate on write** — after a successful mutation, `fetchWithCache` calls");
    w("   `invalidateUrl(url)` which generates tags from the URL, expands cascading deps,");
    w("   and sends `INVALIDATE_TAG` messages to the SW.");
    w("3. **SW deletes cache** — the SW queries IndexedDB by tag (multiEntry index), deletes");
    w("   matching entries from cache storage, and enqueues background refetches.");
    w("");

    w("### `fetchWithCache` options for invalidation");
    w("");

    w("| Option | Type | Description |");
    w("|--------|------|-------------|");
    w("| `tags` | `string[]` | **(read only)** Custom tags attached to the cached response via `X-SW-Cache-Tags`. Auto-generated from URL if omitted. |");
    w("| `invalidate` | `'auto' \\| string[] \\| false` | Controls post-mutation invalidation. `'auto'` (default): generate tags from URL + expand cascading. `string[]`: invalidate these exact tags. `false`: skip invalidation. |");
    w("| `validateSuccess` | `(res) => boolean` | Custom success check for mutations. Default: `res.ok`. Return `false` to skip invalidation (e.g., `(res) => res.status === 200`). |");
    w("");

    w("**Examples:**");
    w("```ts");
    w(`import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
    w("");
    w('// Auto: generate tags, auto-invalidate on mutation');
    w('await fetchWithCache("/api/todos", { method: "POST", body: {...} });');
    w("");
    w('// Explicit tags — invalidate these exact tags after mutation');
    w('await fetchWithCache("/api/todos", {');
    w('  method: "POST",');
    w('  tags: ["custom-tag"],');
    w('  invalidate: ["custom-tag"],');
    w('});');
    w("");
    w('// Skip auto-invalidation; invalidate manually later');
    w('await fetchWithCache("/api/todos", { method: "POST", invalidate: false });');
    w('// ... later:');
    w('await invalidateUrl("/api/todos");');
    w("");
    w('// Custom success validation (API returns 200 { success: false })');
    w('await fetchWithCache("/api/todos", {');
    w('  method: "POST",');
    w('  body: {...},');
    w('  validateSuccess: (res) => res.status === 200,');
    w('});');
    w("```");
    w("");

    w("### Decision tree — which function to call?");
    w("```");
    w("After a write (POST / PUT / PATCH / DELETE):");
    w("  │");
    w("  ├─ You used fetchWithCache() with invalidate: 'auto' (default)");
    w("  │   → Nothing extra needed — auto-invalidation triggers on success");
    w("  │");
    w("  ├─ You used fetchWithCache() with invalidate: ['tag1', 'tag2']");
    w("  │   → Nothing extra needed — those exact tags are invalidated");
    w("  │");
    w("  ├─ You need to invalidate by URL (generate tags from path):");
    w("  │   → await invalidateUrl('/api/todos/42')");
    w("  │");
    w("  ├─ You need to invalidate by method + URL:");
    w("  │   → await invalidateByMethod('POST', '/api/todos')");
    w("  │");
    w("  ├─ You know the exact tag name:");
    w("  │   → await invalidateByTag('todos')");
    w("  │");
    w("  └─ You need to invalidate multiple tags:");
    w("      → await invalidateByTags(['todos', 'categories'])");
    w("```");
    w("");

    w("### Tag generation — URL → tags");
    w("Tags can be generated from URLs in two ways:");
    w("");

    w("#### 1. Segment-based fallback (default)");
    w("When no patterns match, tags are generated by splitting the URL path:");
    w("```");
    w("/api/todos        →  ['todos']");
    w("/api/todos/42     →  ['todos', 'todo:42']");
    w("/api/todos/42/cmt →  ['todos', 'todo:42', 'cmt']");
    w("```");
    w("Prefix matching skips `/api`, `/v1`, `/v2`, `/graphql`, etc.");
    w("Collection names ending in `s` are singularized for the ID tag.");
    w("");

    w("#### 2. Glob pattern matching (configurable)");
    w("Define patterns in your config for custom tag generation:");
    w("```json");
    w('"tagInvalidation": {');
    w('  "patterns": {');
    w('    "/api/users/:id": ["users", "user:{id}"],');
    w('    "/api/**": ["api"],');
    w('    "/api/{users,posts}/*": ["{resource}", "{resource}:{id}"],');
    w('    "/api/projects/*/tasks": ["projects", "tasks"]');
    w('  },');
    w('  "singularization": { "people": "person" },');
    w('  "prefixes": ["api", "v1"]');
    w('}');
    w("```");
    w("| Pattern | Matches | Tags |");
    w("|---------|---------|------|");
    w("| `:param` | `/api/users/42` | Named capture group |");
    w("| `*` | `/api/users/abc` | Single path segment (no `/`) |");
    w("| `**` | `/api/users/123/posts` | Any number of segments |");
    w("| `{a,b}` | `/api/users/42` or `/api/posts/42` | Alternation |");
    w("");

    w("### Cascading invalidation — tag A → tags B, C");
    w("When you invalidate a tag, its cascading dependencies are also invalidated automatically.");
    w("Configured in the `tagInvalidation` config:");
    w("```json");
    w('"tagInvalidation": {');
    w('  "cascading": {');
    w('    "users": ["sessions", "permissions"],');
    w('    "todos": ["categories", "stats"]');
    w('  }');
    w('}');
    w("```");
    w("Now `invalidateUrl('/api/users')` invalidates `users`, `sessions`, and `permissions`.");
    w("");

    w("### Functions reference");
    w("");

    w("**`invalidation-tags.ts` — tag generation and URL-level invalidation**");
    w("| Function | Purpose | Example |");
    w("|----------|---------|---------|");
    w("| `generateTags(url)` | URL → tags (patterns + segment fallback) | `generateTags('/api/todos/42') → ['todos', 'todo:42']` |");
    w("| `generateTagsFromMethod(method, url)` | URL → method-prefixed tags | `generateTagsFromMethod('POST', '/api/todos') → ['post-todos']` |");
    w("| `invalidateUrl(url)` | Generate tags + expand cascading + invalidate | `await invalidateUrl('/api/todos/42')` |");
    w("| `invalidateByMethod(method, url)` | Method-prefixed tags + cascading + invalidate | `await invalidateByMethod('DELETE', '/api/todos/42')` |");
    w("| `expandCascading(tags)` | Expand cascading deps, dedup | `expandCascading(['users']) → ['users', 'sessions', 'permissions']` |");
    w("");

    w("**`cache.ts` — low-level tag invalidation**");
    w("| Function | Purpose | Example |");
    w("|----------|---------|---------|");
    w("| `invalidateByTag(tag)` | Send INVALIDATE_TAG to SW + fire `cache-invalidated` event | `await invalidateByTag('todos')` |");
    w("| `invalidateByTags(tags)` | Invalidate multiple tags in parallel | `await invalidateByTags(['todos', 'categories'])` |");
    w("");

    w("**`fetch-wrapper.ts` — automatic invalidation**");
    w("| Function | Purpose |");
    w("|----------|---------|");
    w("| `fetchWithCache(input, options)` | Auto-tags reads via `X-SW-Cache-Tags`. Auto-invalidates after mutation success using `options.invalidate`. |");
    w("| `prefetchCache(input, options)` | Fire-and-forget cache warming; inherits all tag behavior. |");
    w("");

    if (ctx.frameworkName === "react") {
      w("**React Hooks**");
      w("| Hook | Returns | Description |");
      w("|------|---------|-------------|");
      w("| `useCacheInvalidation()` | `{ invalidateByTag, invalidateByTags, invalidateUrl }` | Stable `useCallback`-wrapped invalidation functions. |");
      w("| `useCachedFetch(url, options?)` | `{ data, error, loading, refetch }` | Auto-refetches when the SW dispatches `cache-invalidated` events matching the URL's tags. |");
      w("");

      w("### React Hook: `useCacheInvalidation`");
      w("```tsx");
      w(`import { useCacheInvalidation } from "./swoff/hooks/useCacheInvalidation.${ext}x";`);
      w("");
      w('const { invalidateByTag, invalidateByTags, invalidateUrl } = useCacheInvalidation();');
      w("");
      w('// Invalidate after manual mutation');
      w('await invalidateUrl("/api/todos");');
      w("```");
      w("");
    }
  }

  // ── Cross-tab Sync ──
  if (config.features.crossTabSync) {
    wb("## 🔄 Cross-tab Sync — keep tabs in sync");
    w("When the user opens your app in multiple browser tabs, changes in one tab (logout, mutation sync)");
    w("are broadcast to all other tabs via the service worker.");
    w("");

    w("No separate imports needed — this is handled automatically by `client-injector.ts`.");
    w("The service worker listens for invalidation events and forwards them to all clients.");
    w("");

    if (!tagInvalidationEnabled(config)) {
      w("> ⚠️ Cross-tab sync requires tag invalidation to be enabled for full functionality.");
      w("");
    }
  }

  // ── Server Push ──
  if (config.features.serverPush.enabled) {
    wb("## 📡 Server Push Events — real-time cache invalidation");
    w("Instead of polling, the service worker maintains an SSE or WebSocket connection to your push endpoint.");
    w("When the server signals that data has changed (via an `invalidate` event), the SW automatically");
    w("calls `invalidateByTag()` so the next read gets fresh data.");
    w("");

    const pushType = config.features.serverPush.type;
    w(`### Transport: **${pushType.toUpperCase()}**`);
    if (pushType === "sse") {
      w("The SW establishes an `EventSource` connection. The server sends events with event name `invalidate`");
      w("and a JSON payload: `{ tags: string[] }`. On receiving it, the SW calls `invalidateByTags(tags)`.");
      w("");
      w("**Server format (SSE):**");
      w("```");
      w("event: invalidate");
      w("data: {\"tags\":[\"todos\",\"categories\"]}");
      w("");
      w("```");
    } else {
      w("The SW establishes a WebSocket connection. The server sends text frames with JSON payload:");
      w('`{ "event": "invalidate", "tags": string[] }`. On receiving it, the SW calls `invalidateByTags(tags)`.');
      w("");
      w("**Server format (WebSocket):**");
      w("```json");
      w('{ "event": "invalidate", "tags": ["todos", "categories"] }');
      w("```");
    }
    w("");

    w("### `server-push.ts` — Client-side connection manager");
    w("```ts");
    w(`import { startPushEvents, stopPushEvents, isPushConnected } from "./swoff/server-push.${ext}";`);
    w("");
    w("// Start listening for push events");
    w("startPushEvents();");
    w("");
    w("// Check connection");
    w('if (isPushConnected()) {');
    w('  console.log("Connected to push endpoint");');
    w("}");
    w("```");
    w("");

    w("**Functions:**");
    w("- `startPushEvents()` — connect to the push endpoint and begin listening for invalidation events");
    w("- `stopPushEvents()` — disconnect from the push endpoint");
    w("- `isPushConnected()` — check if the connection is active");
    w("");

    w("> ⚠️ The service worker directly manages the SSE/WS connection for reliability across page navigations.");
    w("> The client-side `server-push.ts` is a fallback that starts the connection when the SW is not yet active.");
    w("");

    if (ctx.frameworkName === "react") {
      w("### React Hook: `useServerPush()` (coming in a future release)");
      w("");
    }
  }

  // ── Push Notifications ──
  if (config.features.pushNotifications?.enabled) {
    wb("## 🔔 Push Notifications — subscription management");
    w("Swoff generates a push notification subscription client with IndexedDB persistence");
    w("and the service worker push event handlers.");
    w("");

    w("### `push.ts` — Client-side subscription management");
    w("```ts");
    w(`import { subscribeToPush, unsubscribeFromPush, isSubscribed } from "./swoff/push.${ext}";`);
    w("");
    w("// Subscribe (triggers permission prompt)");
    w('const sub = await subscribeToPush("YOUR_VAPID_PUBLIC_KEY");');
    w("if (sub) {");
    w('  await fetch("/api/push/subscribe", {');
    w('    method: "POST",');
    w("    body: JSON.stringify(sub.toJSON()),");
    w("  });");
    w("}");
    w("");
    w("// Unsubscribe");
    w("await unsubscribeFromPush();");
    w("```");
    w("");

    w("**Functions:**");
    w("- `subscribeToPush(vapidPublicKey)` — request permission and subscribe");
    w("- `unsubscribeFromPush()` — unsubscribe and clear stored subscription");
    w("- `isSubscribed()` — check if subscribed");
    w("- `getPushSubscription()` — get current PushSubscription object");
    w("- `requestNotificationPermission()` — request permission only (returns boolean)");
    w("");

    if (ctx.frameworkName === "react") {
      w("### React Hook: `usePushSubscription`");
      w("```tsx");
      w(`import { usePushSubscription } from "./swoff/hooks/usePushSubscription.${ext}x";`);
      w("");
      w('const { subscribed, subscription, permission, loading, subscribe, unsubscribe } =');
      w('  usePushSubscription("YOUR_VAPID_PUBLIC_KEY");');
      w("```");
      w("");

      w("**Returns** `{ subscribed, subscription, permission, loading, subscribe, unsubscribe }`");
      w("The hook listens for push-subscription-changed and push-permission-changed events.");
      w("Use `subscribe()` and `unsubscribe()` to toggle push notifications.");
      w("");
    }
  }

  // ── PWA ──
  if (config.features.pwa.enabled) {
    wb("## 📱 PWA — installable web app");
    w("Swoff adds a beforeinstallprompt handler and install flow so users can install your app");
    w("on their home screen.");
    w("");

    w("### `pwa/install.ts`");
    w("```ts");
    w(`import { setupPwaInstall, isInstallable, promptInstall } from "./swoff/pwa/install.${ext}";`);
    w("");
    w("setupPwaInstall(); // called automatically by client-injector.ts");
    w("");
    w("// Show install button when available");
    w("if (isInstallable()) {");
    w('  const { outcome } = await promptInstall();');
    w("}");
    w("```");
    w("");

    w("**Functions:**");
    w("- `setupPwaInstall()` — listen for beforeinstallprompt/appinstalled events (called by client-injector)");
    w("- `isInstallable()` — check if install prompt is available");
    w("- `promptInstall()` — show the native install prompt");
    w("");

    w("### `manifest.json`");
    w("Generated in `swoff/manifest.json`. If you want it exposed at the root, copy it to your `public/` directory.");
    w("");

    if (ctx.frameworkName === "react") {
      w("### React Hooks");
      w("- `useSWUpdate()` — returns `{ updateStatus, currentVersion, availableVersion, forceUpdate, error, acceptUpdate, dismissUpdate }`");
      w("- `useSWProgress()` — returns `{ status, progress }` for download progress during SW update");
      w("- `useCachedFetch(url, options?)` — fetches with auto-refetch on tag invalidation, see Fetch Wrapper section");
      w("");
    }
  }

  // ── Build Script ──
  wb("## 🏗️ Build script");
  w("The SW generator must run after every build to produce the final service worker file.");
  w("Swoff has already added this to your `package.json` build script for you:");
  w("```");
  w('"build": "<your-build> && node swoff/sw/generator.js"');
  w("```");
  w("If you run `swoff clean`, this script suffix will be removed automatically.");
  w("");

  // ── Config file ──
  wb("## ⚙️ swoff.config.json");
  w("This is the configuration file that controls which features are enabled and how they behave.");
  w("Re-run `npx @swoff/cli generate` after changing it.");
  w("");

  w("### Features you can toggle:");
  w("- `mutationQueue.enabled` — offline write queue with IndexedDB. Object: `{ enabled, batchSize, batchDelayMs, maxRetries, retryBackoffMs }`");
  w("- `backgroundSync` — Background Sync API (Chrome/Edge only)");
  w("- `auth.enabled` — auth module (bearer/cookie/custom)");
  w("- `crossTabSync` — broadcast changes across tabs");
  w("- `tagInvalidation` — cache invalidation by tags with glob patterns, cascading, and configurable singularization. Object: `{ enabled, prefixes, patterns, singularization, cascading }`");
  w("- `graphql.enabled` — GraphQL wrapper with body-hash caching. Object: `{ enabled, endpoint }`");
  w("- `pwa.enabled` — PWA install prompt and manifest");
  w("- `serverPush.enabled` — real-time cache invalidation via SSE/WebSocket. Object: `{ enabled, type, endpoint, reconnectDelayMs }`");
  w("- `serviceWorker.cacheStrategy` — caching strategy mode (`\"all\"` or `\"explicit-only\"`)");
  w("- `serviceWorker.defaultStrategy` — default caching strategy");
  w("- `serviceWorker.strategies` — per-route strategy overrides");
  w("- `serviceWorker.staleTime` — global stale time in seconds (data considered fresh for N seconds). Applies to cache-first and network-first only.");
  w("- `serviceWorker.refetchBatchSize` — max stale cache entries to refetch per batch");
  w("");

  w("---");

  writeFile(ctx, "GUIDE.md", lines.join("\n"));
}
