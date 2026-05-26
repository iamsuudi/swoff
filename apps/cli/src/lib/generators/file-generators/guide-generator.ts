/**
 * Generates GUIDE.md — full integration guide for enabled features.
 */

import { GeneratorContext, writeFile } from "./context.js";

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
  w("1. **Per-request override (highest)** — set `strategy` or `staleWhileRevalidate` on `fetchWithCache()`.");
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
  w("| Strategy | Behavior | Best for |");
  w("|----------|----------|----------|");
  w("| `cache-first` | Return cached if available, else fetch + cache. Default | Static assets, images, fonts |");
  w("| `network-first` | Try network, cache on success, fall back to cache | API endpoints, dynamic content |");
  w("| `stale-while-revalidate` | Return cached immediately, refresh in background | Fast UI, non-critical data |");
  w("| `cache-only` | Serve from cache only (404 if missing) | Offline-critical assets |");
  w("| `network-only` | Always fetch, never cache | Sensitive or real-time data |");
  w("");

  // ── Mutation Queue ──
  if (config.features.mutationQueue) {
    wb("## 📝 Mutation Queue — offline writes that sync when back online");
    w("When the user is offline and performs a write (POST/PUT/PATCH/DELETE), `queueMutation` stores it");
    w("in IndexedDB. When the connection returns, `processMutationQueue` replays them in order.");
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
    w("- `processMutationQueue()` — replay all queued writes. Runs automatically on `online` event.");
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
  if (config.features.tagInvalidation) {
    wb("## 🏷️ Tag Invalidation — keep cached data fresh");
    w("When data changes on the server, cached responses in the SW become stale. Tag invalidation");
    w("lets you mark related cache entries as stale so they're re-fetched on next request.");
    w("");

    w("### How it works");
    w("1. When fetching, attach tags: `fetchWithCache(url, { tags: generateTags(url) })`");
    w("2. After a mutation, invalidate: `await invalidateUrl(url)`");
    w("3. The SW removes all cached responses that were tagged with the related tags");
    w("");

    w("### `invalidation-tags.ts` — Tag generation helpers");
    w("```ts");
    w(`import { generateTags, invalidateUrl } from "./swoff/invalidation-tags.${ext}";`);
    w("");
    w('// Tag reads');
    w('const data = await fetchWithCache("/api/todos", { tags: generateTags("/api/todos") });');
    w("");
    w('// Invalidate after writing');
    w('await invalidateUrl("/api/todos/42");');
    w("```");
    w("");

    w("**Functions:**");
    w("- `generateTags(url)` — extract tags from a URL path. e.g. `/api/todos/42` → `[\"todos\", \"todo:42\"]`");
    w("- `generateTagsFromMethod(method, url)` — method-prefixed tags. e.g. `post-todos`");
    w("- `invalidateUrl(url)` — extract tags and invalidate all matching cache entries");
    w("- `invalidateByMethod(method, url)` — invalidate using method-prefixed tags");
    w("");

    w("### `cache.ts` — Low-level invalidation");
    w("```ts");
    w(`import { invalidateByTag, invalidateByTags } from "./swoff/cache.${ext}";`);
    w("");
    w('await invalidateByTag("todos");');
    w('await invalidateByTags(["todos", "categories"]);');
    w("```");
    w("");

    w("**Functions:**");
    w("- `invalidateByTag(tag)` — invalidate a single tag. Dispatches `cache-invalidated` event.");
    w("- `invalidateByTags(tags)` — invalidate multiple tags.");
    w("");

    if (ctx.frameworkName === "react") {
      w("### React Hook: `useCacheInvalidation`");
      w("Reactive wrapper around cache invalidation functions.");
      w("```tsx");
      w(`import { useCacheInvalidation } from "./swoff/hooks/useCacheInvalidation.${ext}x";`);
      w("");
      w('const { invalidateByTag, invalidateByTags, invalidateUrl } = useCacheInvalidation();');
      w("```");
      w("");
      w("Returns stable `useCallback`-wrapped versions of each invalidation function.");
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

    if (!config.features.tagInvalidation) {
      w("> ⚠️ Cross-tab sync requires tag invalidation to be enabled for full functionality.");
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
  w("- `mutationQueue` — offline write queue with IndexedDB");
  w("- `backgroundSync` — Background Sync API (Chrome/Edge only)");
  w("- `auth.enabled` — auth module (bearer/cookie/custom)");
  w("- `crossTabSync` — broadcast changes across tabs");
  w("- `tagInvalidation` — cache invalidation by tags");
  w("- `pwa.enabled` — PWA install prompt and manifest");
  w("- `serviceWorker.cacheStrategy` — caching strategy mode (`\"all\"` or `\"explicit-only\"`)");
  w("- `serviceWorker.defaultStrategy` — default caching strategy");
  w("- `serviceWorker.strategies` — per-route strategy overrides");
  w("");

  w("---");

  writeFile(ctx, "GUIDE.md", lines.join("\n"));
}
