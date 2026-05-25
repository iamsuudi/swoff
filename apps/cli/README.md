# @swoff/cli

CLI for [Swoff](https://swoff.netlify.app) — offline-first web apps made easy.

Swoff generates a **service worker** and **client-side utilities** that give your web app:

- **Offline support** — cached API responses work without a connection
- **Mutation queue** — writes performed offline replay when back online
- **Auth** — token management with automatic 401 handling
- **Cache invalidation** — tag-based cache busting after mutations
- **PWA** — install prompt and manifest
- **Cross-tab sync** — broadcast changes across open tabs
- **Background Sync API** — process mutations even after tab close

It lives in your project as a `swoff/` directory — everything is generated, auditable, and editable.

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)

---

## Quick Start

```bash
# Initialize configuration (creates swoff.config.json)
npx @swoff/cli init

# Generate service worker and supporting files
npx @swoff/cli generate

# Import the generated entry point in your app
```

```js
import { initServiceWorker } from "./swoff/client-injector.js";

initServiceWorker();
```

Then build your app:

```bash
npm run build
```

The build script auto-appends `node swoff/sw/generator.js` to finalize the service worker with your asset hashes.

---

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `swoff.config.json` with auto-detected framework and language |
| `generate` | Generate service worker and all supporting files |
| `add <feature>` | Enable a feature and regenerate |
| `validate` | Validate `swoff.config.json` |
| `info [feature]` | Show summary or per-feature details |
| `clean` | Remove all Swoff files (`swoff/`, config, `version.json`) |
| `help [command]` | Show help for a specific command |

### `init`

Creates `swoff.config.json` in your project root. Auto-detects:

- **Framework**: react, vue, svelte, or vanilla
- **Language**: TypeScript or JavaScript
- **Build tool**: Uses existing `package.json` build script

```bash
swoff init
swoff init --framework react   # override detection
```

### `generate`

Generates the service worker (`dist/sw-<version>.js`) and all supporting files into `swoff/`. Also auto-appends the SW generator to your `package.json` build script.

```bash
swoff generate
swoff generate --sw-only      # regenerate only the service worker
swoff generate --files-only   # regenerate only supporting files
```

After generation, read `swoff/GUIDE.md` for the full integration guide for your project.

### `add <feature>`

Enables a feature in `swoff.config.json` and regenerates.

```bash
swoff add pwa
swoff add mutation-queue
swoff add auth
swoff add tag-invalidation
swoff add cross-tab
swoff add background-sync
swoff add client-registration
```

### `info`

Shows enabled features and file count, or detailed docs for a specific feature.

```bash
swoff info                 # summary
swoff info auth            # auth details and functions
swoff info mutation-queue  # mutation queue details
```

### `clean`

Removes every generated file:

```bash
swoff clean
```

This deletes `swoff/`, `swoff.config.json`, `version.json`, and removes the SW generator from your build script.

---

## Configuration (`swoff.config.json`)

```json
{
  "framework": "react",
  "language": "ts",
  "buildCommand": "vite build",
  "features": {
    "mutationQueue": true,
    "backgroundSync": false,
    "crossTabSync": false,
    "tagInvalidation": true,
    "clientRegistration": true,
    "pwa": {
      "enabled": false
    },
    "auth": {
      "enabled": true,
      "type": "bearer",
      "refreshPath": "/api/refresh",
      "userEndpoint": "/api/me"
    }
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `framework` | `"react"` \| `"vue"` \| `"svelte"` \| `"vanilla"` | auto | Your UI framework |
| `language` | `"ts"` \| `"js"` | auto | TypeScript or JavaScript output |
| `buildCommand` | `string` | auto | Your build command (detected from `package.json`) |
| `features.mutationQueue` | `boolean` | `false` | Offline write queue |
| `features.backgroundSync` | `boolean` | `false` | Background Sync API |
| `features.crossTabSync` | `boolean` | `false` | Cross-tab broadcast |
| `features.tagInvalidation` | `boolean` | `false` | Tag-based cache invalidation |
| `features.clientRegistration` | `boolean` | `false` | SW registration lifecycle |
| `features.pwa.enabled` | `boolean` | `false` | PWA install + manifest |
| `features.auth.enabled` | `boolean` | `false` | Auth module |
| `features.auth.type` | `"bearer"` \| `"cookie"` \| `"custom"` | — | Auth strategy |
| `features.auth.refreshPath` | `string` | `"/api/refresh"` | Token refresh endpoint |
| `features.auth.userEndpoint` | `string` | `"/api/me"` | Current user endpoint |

---

## Generated File Structure

```
swoff/
├── client-injector.ts     # Single entry point — import and call initServiceWorker()
├── fetch-wrapper.ts       # Unified fetch with caching, auth, offline queue
├── cache.ts               # Low-level cache invalidation (tagInvalidation)
├── invalidation-tags.ts   # Tag generation helpers (tagInvalidation)
├── mutation-queue.ts      # Offline write queue (mutationQueue)
├── background-sync.ts     # Background Sync API (backgroundSync)
├── swoff.d.ts             # TypeScript declarations
│
├── auth/
│   ├── store.ts           # Auth token/user persistence
│   ├── fetch.ts           # Authenticated fetch wrapper
│   ├── user.ts            # User data caching
│   └── state.ts           # Online/offline × auth state detection
│
├── hooks/                 # React hooks (if framework = react)
│   ├── useAuth.tsx
│   ├── useCachedFetch.tsx
│   ├── useMutationQueue.tsx
│   └── usePWAUpdate.tsx
│
├── pwa/
│   └── install.ts
│
├── sw/
│   ├── template.js        # Service worker source
│   ├── injector.ts        # SW registration logic
│   └── generator.js       # Build-time SW generator
│
├── manifest.json
├── GUIDE.md               # Full integration walkthrough
└── README.md              # Quick reference
```

---

## Feature Deep-Dive

### Mutation Queue

When the user is offline, write operations (POST/PUT/DELETE) are stored in IndexedDB. They replay automatically when the connection returns.

```js
import { queueMutation, getPendingCount } from "./swoff/mutation-queue.js";

// Offline write — stored and replayed when online
await queueMutation({
  method: "POST",
  url: "/api/todos",
  body: { title: "Buy milk" },
  tags: ["todos"],
});

// Show sync badge
const count = await getPendingCount();
```

The queue processes automatically on the `online` event. Call `flushMutations()` after re-login to retry mutations that failed due to auth expiry.

### Fetch Wrapper

Drop-in replacement for `fetch()` that communicates with the service worker about caching strategy.

```js
import { fetchWithCache } from "./swoff/fetch-wrapper.js";

// Reads are cached for offline access
const { response, fromCache } = await fetchWithCache("/api/todos");
const data = await response.json();

// Writes auto-invalidate related cache tags
await fetchWithCache("/api/todos", {
  method: "POST",
  body: JSON.stringify({ title: "New task" }),
});

// Auth requests
const { response: user } = await fetchWithCache("/api/me", { auth: true });
```

Returns `{ response: Response, fromCache: boolean }`.

### Auth

Token-based authentication with memory-only tokens and automatic 401 handling.

```js
import { authenticatedFetch } from "./swoff/auth/fetch.js";

// Attaches Bearer token, handles 401
const user = await authenticatedFetch("/api/me").then((r) => r.json());

// For mutations too — no separate wrapper needed
await authenticatedFetch("/api/todos", {
  method: "POST",
  body: JSON.stringify({ title: "New" }),
});
```

Auth endpoints (`/login`, `/logout`, `/register`) automatically bypass the SW cache. On 401, `sw-auth-unauthorized` is dispatched and the token is cleared.

### Cache Invalidation

Tag-based invalidation keeps the service worker cache fresh after mutations.

```js
import { generateTags, invalidateUrl } from "./swoff/invalidation-tags.js";

// Tag reads automatically
const data = await fetchWithCache("/api/todos", {
  tags: generateTags("/api/todos"),
});

// Invalidate after writing
await invalidateUrl("/api/todos/42");
```

When the SW receives an invalidation, it removes matching cache entries and attempts to background-refetch them. If the refetch fails (network error), the old cached entry is served with a stale-while-revalidate fallback.

### PWA

Install prompt handling and manifest generation.

```js
import { isInstallable, promptInstall } from "./swoff/pwa/install.js";

// Show install button conditionally
if (isInstallable()) {
  const { outcome } = await promptInstall();
}
```

### React Hooks

When `framework` is `"react"`, generated hooks provide reactive state:

| Hook | Returns | Description |
|------|---------|-------------|
| `useAuth()` | `{ authenticated, user, online }` | Auth + connectivity state |
| `useCachedFetch(url, options?)` | `{ data, error, loading, refetch }` | Auto-refetches on tag invalidation |
| `useMutationQueue()` | `{ pending, lastSync }` | Queue status and sync results |
| `usePWAUpdate()` | `{ updateStatus, progress, forceUpdate, acceptUpdate, dismissUpdate }` | SW update management |
| `useSWProgress()` | `{ status, progress }` | Download progress during SW update |

```tsx
import { useCachedFetch } from "./swoff/hooks/useCachedFetch.tsx";

function TodosList() {
  const { data, loading } = useCachedFetch("/api/todos");

  if (loading) return <Spinner />;
  return <TodoList data={data} />;
}
```

### Build Script

After `swoff generate`, your `package.json` build script is updated to:

```json
"build": "vite build && node swoff/sw/generator.js"
```

The generator learns your build output and precaches all assets in the service worker. Running `swoff clean` removes this suffix.

---

## Service Worker Architecture

The generated service worker (`sw/template.js`) implements:

- **Cache strategies**: network-first for API routes, cache-first for assets
- **Tag invalidation**: removes stale cache entries and background-refetches
- **Stale-while-revalidate**: on refetch failure, serves cached content with a stale indicator
- **Offline fallback**: returns cached responses when the network is unavailable
- **Cross-tab sync**: forwards invalidation events to all open clients
- **PWA lifecycle**: skip-waiting, activate, and install event handling

The build-time generator (`sw/generator.js`) collects your built asset files and embeds their hashes into the service worker, so cached assets are versioned and updated when they change.

---

## Requirements

- Node.js >= 18
- A build tool with a `package.json` build script (Vite, Webpack, etc.)
- HTTPS or localhost (required for service workers)

## License

MIT
