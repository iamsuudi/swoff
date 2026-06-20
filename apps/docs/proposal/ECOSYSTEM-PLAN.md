# Swoff Ecosystem Plan — Universal Client + Per-Ecosystem Adapters

## Problem Statement

Today, all swoff-generated files are **ES modules** (`.js` / `.ts`) that depend on each other via `import` statements. This means:

- **React / Vue / Svelte users** with a bundler (Vite, Webpack, etc.) work fine — `import { initServiceWorker } from './swoff/client-injector'` just works.
- **Python/Django, Laravel/PHP, Go, Rails, HTMX users** cannot use the generated files without setting up a JS build pipeline, which many explicitly want to avoid.

The core value of swoff (SW caching, offline support, PWA) is **language-agnostic** — the SW itself is a browser-level proxy. The generated JS files are just convenience wrappers around HTTP headers and `postMessage` calls.

---

## Three-Phase Plan

### Phase A: Universal Auto-Initializing Client Injector

**Goal:** A single `<script src="...">` tag that registers the SW, sets up lifecycle listeners, and handles all configured features — no imports, no bundler, no manual `initServiceWorker()` call.

#### What it replaces

Today's `client-injector.{js,ts}` is an ES module with imports:

```js
import { initServiceWorker as swInit } from "./sw/injector.js";
import { setupPwaInstall } from "./pwa/injector.js";
import { processMutationQueue, clearQueue } from "./mutation/queue.js";
import { ensureValidAuth, clearMemoryAuth } from "./auth/store.js";
import { getStorageEstimate, formatBytes } from "./storage.js";
import { startPushEvents } from "./server-push/client.js";
import { prefetchCache } from "./fetch/core.js";
import { dispatchState, startHeartbeat, stopHeartbeat, verifyAndNotify } from "./connectivity.js";
```

The universal variant inlines everything:

```
swoff/
├── client-injector.{js,ts}            ← ES module (existing, for bundler users)
└── client-injector.bundle.{js,ts}     ← IIFE global (new, for <script src> users)
```

#### What gets inlined

| Module | Always or Conditional | Lines of code (est.) |
|---|---|---|
| `sw/injector` — SW registration | Always | ~60 |
| `connectivity` — Heartbeat + online detection | Always | ~80 |
| `storage` — Quota check | Always | ~20 |
| `pwa/prompt` — Install prompt | If pwa enabled | ~60 |
| `mutation/queue` — SW message forwarding | If mutationQueue enabled | ~10 (just the fn call) |
| `auth/store` — Auth message handling | If auth enabled | ~30 (just the fn calls) |
| `server-push/client` — Push event start | If serverPush enabled | ~5 (just the fn call) |
| **Total (all features)** | | **~265 lines** |

The bundle is self-contained. At the bottom it auto-calls `initServiceWorker()`:

```js
// Auto-initialize on load
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  initServiceWorker().catch(function(err) {
    console.warn("Swoff SW registration failed:", err);
  });
}
```

#### Usage

```html
<!-- ES module user (React, Vue, etc.) — unchanged -->
<script type="module">
  import { initServiceWorker } from './swoff/client-injector.js';
  initServiceWorker();
</script>

<!-- Global script user (Django, Laravel, Go, HTMX, etc.) — just this -->
<script src="/swoff/client-injector.bundle.js"></script>
```

#### What the user gets for free (no API calls)

- **SW registration** + auto-update on byte-diff
- **Online/offline heartbeat** with `window` events (`swoff:notification`, `sw-ready`, `sw-error`)
- **Storage quota warning** when >80% full
- **PWA install prompt** (if enabled in config)
- **Cross-tab auth coherency** (if auth enabled)
- **Server-push event stream** (if enabled)
- **Runtime caching** — the SW intercepts all same-origin GET requests and caches according to the configured strategy. No JS needed — the SW reads HTTP headers.
- **Offline fallback pages** — configured in `swoff.config.json`, served automatically by the SW.
- **Precached assets** — configured in JSON, fetched and cached at install time.

---

### Phase B: Global `window.swoff` API Bundle

**Goal:** Make the convenience functions (`fetchWithCache`, `invalidateByTag`, etc.) available without imports.

```html
<script src="/swoff/client-injector.bundle.js"></script>
<script src="/swoff/swoff-api.bundle.js"></script>
<script>
  // No import needed
  swoff.fetchWithCache("/api/todos").then(function(r) { return r.json(); });
  swoff.invalidateByTag("todos");
</script>
```

#### Functions exposed on `window.swoff`

```js
window.swoff = {
  // Core data fetching
  fetchWithCache:   function(url, opts) { /* ... */ },
  prefetchCache:    function(url, opts) { /* ... */ },

  // Cache invalidation
  invalidateByTag:   function(tag) { /* ... */ },
  invalidateByTags:  function(tags) { /* ... */ },
  invalidateUrl:     function(url) { /* ... */ },
  invalidateByMethod: function(method, url) { /* ... */ },

  // Cache tags
  generateTags:      function(url) { /* ... */ },

  // Auth (if enabled)
  setAuth:          function(data) { /* ... */ },
  getAuth:          function() { /* ... */ },
  clearAuth:        function() { /* ... */ },
  ensureValidAuth:  function() { /* ... */ },

  // Mutation queue (if enabled)
  queueMutation:    function(mutation) { /* ... */ },
  flushMutations:   function() { /* ... */ },
  getPendingCount:  function() { /* ... */ },

  // PWA (if enabled)
  promptInstall:    function() { /* ... */ },
  isInstallable:    function() { /* ... */ },

  // Utilities
  resetSwoff:       function(opts) { /* ... */ },
  skipWaiting:      function() { /* ... */ },
  forceRetry:       function() { /* ... */ },
  getCurrentOnlineStatus: function() { /* ... */ },
};
```

Controlled by config flag: `features.serviceWorker.outputApiBundle: true` (default `false`).

---

### Phase C: Per-Ecosystem Adapters

Each ecosystem adapter translates the same underlying SW protocol (HTTP headers + postMessage) into the ecosystem's native idioms.

#### What all adapters share

The SW protocol is language-agnostic:

1. **Set request headers** → SW caches based on `X-SW-*` headers
2. **Send postMessage** → SW invalidates tags, introspects cache
3. **Listen for window events** → `sw-ready`, `cache-invalidated`, `swoff:offline-fallback`, etc.

Every adapter wraps these three primitives.

---

#### C.1: HTMX Extension

**File:** `swoff/adapters/htmx.js`

**Framework value:** Intercept HTMX requests and automatically route them through the SW cache protocol. No JS imports, no `fetchWithCache` — just HTML attributes.

```html
<script src="/swoff/client-injector.bundle.js"></script>
<script src="/swoff/adapters/htmx.js"></script>

<div hx-ext="swoff">
  <!-- Cache-aware GET -->
  <button hx-get="/api/todos" sw-cache="true">Load</button>

  <!-- Auto-invalidate on mutation -->
  <form hx-post="/api/todos" sw-invalidate="todos">...</form>

  <!-- Per-request strategy override -->
  <a hx-get="/api/checkout" hx-trigger="click" sw-strategy="network-only">Checkout</a>

  <!-- Custom cache tags -->
  <div hx-get="/api/users" sw-tags="users,profiles">Load Users</div>

  <!-- Stale time override for this request -->
  <div hx-get="/api/weather" sw-stale-time="60000">Weather</div>
</div>

<!-- Global invalidation (anywhere on page) -->
<button hx-post="/api/todos" sw-invalidate="todos" sw-invalidate-url="/api/todos">Add Todo</button>
```

**How the extension works:**

| HTMX Event | Action |
|---|---|
| `htmx:configRequest` | Reads `sw-cache`, `sw-invalidate`, `sw-strategy`, `sw-tags`, `sw-stale-time` from triggering element. Adds corresponding `X-SW-*` headers. |
| `htmx:beforeOnLoad` | If `sw-invalidate` was set, sends `postMessage({ type: "INVALIDATE_TAG", tag })` to SW. |
| `htmx:afterSettle` | If `sw-invalidate-url` was set, calls `invalidateUrl()` via `window.swoff`. |

**Generated config:** Enable via `framework: "htmx"` in `swoff.config.json`.

---

#### C.2: Laravel / PHP (Blade)

**Generator:** When `framework: "laravel"`, generate:

```
swoff/
└── adapters/
    └── blade/
        ├── swoff.php              ← Blade directive registration
        └── swoff-middleware.php   ← Response header middleware
```

**Usage in Blade templates:**

```blade
{{-- Layout --}}
<!DOCTYPE html>
<html>
<head>
  @swoffScripts
  {{-- Outputs: <script src="/swoff/client-injector.bundle.js"></script> --}}
  {{-- If api bundle: <script src="/swoff/swoff-api.bundle.js"></script> --}}
</head>
```

**Server-side invalidation via middleware:**

```php
// In a controller
public function store(Request $request)
{
    Todo::create($request->all());
    
    // Tags to invalidate are added to the response headers
    Swoff::invalidateTags(['todos']);
    
    return response()->json(['message' => 'created']);
}
```

The `SwoffMiddleware` reads the accumulated invalidation tags and adds `X-SW-Invalidate-Tags` to the HTTP response. The SW intercepts this header and performs the invalidation.

**Inline JS usage:**

```blade
<script>
  swoff.fetchWithCache('/api/todos')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // render todos
    });
</script>
```

**Package distribution:** The blade directives, middleware, and asset publishing can be packaged as a Composer package (`swoff/swoff-laravel`).

---

#### C.3: Python / Django

**Generator:** When `framework: "django"`, generate:

```
swoff/
└── adapters/
    └── django/
        ├── swoff_tags.py          ← Template tags
        ├── swoff_middleware.py     ← Response header middleware
        └── swoff_client.py        ← Python helper for SW protocol
```

**Usage in templates:**

```django
{% load swoff_tags %}

{% swoff_scripts %}
{# Renders: <script src="/static/swoff/client-injector.bundle.js"></script> #}
```

**Server-side invalidation via middleware:**

```python
# views.py
from swoff.adapters.django import swoff_invalidate

def create_todo(request):
    # ...
    swoff_invalidate(request, ['todos'])
    return JsonResponse({'message': 'created'})

# settings.py
MIDDLEWARE = [
    'swoff.adapters.django.SwoffMiddleware',
    # ...
]
```

**Python client helper (for backend-to-backend or testing):**

```python
from swoff.adapters.django import SwoffClient

client = SwoffClient(base_url="https://example.com")
response = client.fetch_with_cache("/api/todos", strategy="cache-first")
```

This wraps Python's `requests` or `httpx` with the same header protocol the browser uses.

**Package distribution:** Published to PyPI as `swoff-django`.

---

#### C.4: Go

**Generator:** When `framework: "go"`, generate:

```
swoff/
└── adapters/
    └── go/
        ├── swoff.go               ← Client helpers
        └── swoff_middleware.go    ← net/http middleware
```

**Usage in Go templates:**

```go
import "myapp/swoff/adapters/go"

// In template:
// {{ swoffScripts }}
```

**Middleware for server-side invalidation:**

```go
import "myapp/swoff/adapters/go"

mux := http.NewServeMux()
mux.HandleFunc("/api/todos", func(w http.ResponseWriter, r *http.Request) {
    // ... create todo ...
    go.SwoffInvalidate(w, "todos", "users")
})

handler := go.SwoffMiddleware(mux)
```

**Go client for backend use:**

```go
import "myapp/swoff/adapters/go"

client := go.NewSwoffClient("https://example.com")
resp, err := client.FetchWithCache("/api/todos", go.WithStrategy("cache-first"))
```

---

#### C.5: Rails

**Generator:** When `framework: "rails"`, generate:

```
swoff/
└── adapters/
    └── rails/
        ├── swoff_helper.rb        ← View helper
        └── swoff_controller.rb    ← Controller concern
```

**Usage in ERB templates:**

```erb
<%# In layout %>
<%= swoff_scripts %>
```

**Stimulus controller for interactive use:**

```erb
<div data-controller="swoff-cache"
     data-swoff-cache-url-value="/api/todos"
     data-swoff-cache-strategy-value="network-first">
  <ul data-swoff-cache-target="list"></ul>
</div>
```

**Controller concern for server-side invalidation:**

```ruby
class TodosController < ApplicationController
  include Swoff::Controller

  def create
    Todo.create!(params)
    swoff_invalidate_tags("todos")
    render json: { message: "created" }
  end
end
```

**Package distribution:** Published as a Ruby gem `swoff-rails`.

---

#### C.6: Vue / Svelte / Solid

Each follows the same pattern as the existing React hooks — generated as composables/stores that wrap the swoff JS/TS API.

**Vue composable:**

```ts
// swoff/adapters/vue/useCachedFetch.ts
import { ref, onMounted } from 'vue'
import { fetchWithCache } from '../../fetch/core'

export function useCachedFetch(url: string) {
  const data = ref(null)
  const loading = ref(true)
  const error = ref(null)

  onMounted(async () => {
    try {
      const { response } = await fetchWithCache(url)
      data.value = await response.json()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  })

  return { data, loading, error }
}
```

**Svelte store:**

```ts
// swoff/adapters/svelte/cachedFetch.ts
import { writable } from 'svelte/store'
import { fetchWithCache } from '../../fetch/core'

export function createCachedFetch(url: string) {
  const data = writable(null)
  const loading = writable(true)

  fetchWithCache(url).then(r => r.json()).then(result => {
    data.set(result)
    loading.set(false)
  })

  return { data, loading }
}
```

**Solid primitive:**

```tsx
// swoff/adapters/solid/createCachedFetch.ts
import { createResource } from 'solid-js'
import { fetchWithCache } from '../../fetch/core'

export function createCachedFetch(url: () => string) {
  return createResource(url, async (u) => {
    const { response } = await fetchWithCache(u)
    return response.json()
  })
}
```

---

## Ecosystem Adoption Matrix

| Ecosystem | Phase A (Auto-init) | Phase B (Global API) | Phase C (Native Adapter) |
|---|---|---|---|
| **React / Next / Remix** | Uses existing ESM (no change) | N/A (has hooks) | ✅ Hooks exist (16 adapters) |
| **HTMX** | `<script src="...bundle.js">` | `window.swoff.fetchWithCache()` | Extension with HTML attributes |
| **Laravel / PHP** | `@swoffScripts` directive | `window.swoff.fetchWithCache()` | Blade directive + middleware + Alpine |
| **Python / Django** | `{% swoff_scripts %}` | `window.swoff.fetchWithCache()` | Template tags + middleware + client |
| **Go** | `{{swoffScripts}}` template | `window.swoff.fetchWithCache()` | net/http middleware + client |
| **Rails** | `<%= swoff_scripts %>` | `window.swoff.fetchWithCache()` | Stimulus controller + concern |
| **Vue** | Existing ESM or global | `window.swoff.fetchWithCache()` | Composable functions |
| **Svelte** | Existing ESM or global | `window.swoff.fetchWithCache()` | Svelte stores |
| **Solid** | Existing ESM or global | `window.swoff.fetchWithCache()` | Solid primitives |

---

## Implementation Order

```
Phase A (Universal Bundle)
  └── Generator: modify client-injector.ts to emit IIFE variant
  └── Auto-init: call initServiceWorker() at bottom
  └── Conditional inlining: compile feature blocks based on config
  └── Test: verify <script src> works in vanilla HTML

Phase B (Global API Bundle)
  └── Generator: new swoff-api.ts template → swoff-api-global.js
  └── Config flag: features.serviceWorker.outputApiBundle
  └── Test: verify window.swoff.* works from inline scripts

Phase C (Ecosystem Adapters)
  ├── HTMX extension (first — most requested, smallest surface)
  │   └── Generator: new htmx.ts template → adapters/htmx.js
  │   └── Config: framework: "htmx"
  │   └── Test: HTMX todo app with cache + invalidation
  │
  ├── Laravel adapter
  │   └── Generator: blade templates + PHP middleware
  │   └── Package: Composer package swoff/swoff-laravel
  │
  ├── Django adapter
  │   └── Generator: Django template tags + middleware
  │   └── Package: PyPI swoff-django
  │
  ├── Go adapter
  │   └── Generator: Go templates + net/http middleware
  │
  ├── Rails adapter
  │   └── Generator: Stimulus controller + concern
  │   └── Package: Ruby gem swoff-rails
  │
  └── Vue / Svelte / Solid adapters
      └── Generator: composables/stores/actions per framework
      └── Config: framework: "vue", "svelte", "solid"
```

---

## Key Design Decisions

### 1. SW protocol is the contract, not the JS functions

The Service Worker reads **HTTP headers** and **postMessage types**. Any language can speak this protocol. The JS convenience functions are just one implementation.

### 2. Universal bundle does everything the modular version does

No feature loss. The bundle conditionally inlines exactly the same code. Users with bundlers keep the modular version for tree-shaking; users without bundlers use the bundle.

### 3. Ecosystem adapters are optional

The universal bundle + global API covers 90% of use cases. Native adapters (HTMX extension, Django middleware, etc.) are a polish layer — they make swoff feel native to each ecosystem but aren't required to get value.

### 4. Each adapter ships separately

Adapters are generated into `swoff/adapters/` and can be published to their respective package ecosystems (npm, Composer, PyPI, RubyGems). The core swoff CLI only generates the files; the packages provide installable integration.
