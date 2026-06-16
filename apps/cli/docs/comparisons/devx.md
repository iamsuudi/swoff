# Developer Experience: Swoff Config-Driven Code Gen vs Library Setup

Developer experience determines how quickly a team can adopt, configure, debug, and maintain offline infrastructure. Swoff's approach — config-driven code generation — is fundamentally different from installing and configuring runtime libraries.

## How Swoff does it

**One-time setup:**
```
npm install @swoff/cli
npx swoff init                → creates swoff.config.json
npx swoff add auth            → enables auth in config, generates files
npx swoff add mutation-queue  → enables offline queue, generates files
npx swoff generate            → generates all files
```

**What gets created:**
```
swoff/
  config.ts                   — Typed config for runtime (API_BASE, auth, strategies)
  swoff.d.ts                  — TypeScript declarations for generated types
  client-injector.ts          — SW registration entry point
  fetch/core.ts               — fetchWithCache + prefetchCache
  cache/index.ts              — Cache invalidation
  cache/tags.ts               — Tag generation and introspection
  offline/queue.ts            — Mutation queue
  offline/state.ts            — Mutation state tracking
  offline/sync.ts             — Background sync
  auth/store.ts               — Auth token management
  auth/state.ts               — Reactive auth state
  auth/user.ts                — User endpoint helpers
  pwa/prompt.ts               — PWA install prompt
  server-push/client.ts       — SSE push connection
  push-notification/index.ts  — Push notification subscription
  graphql/index.ts            — GraphQL fetch wrapper
  sw/template.js              — Service Worker (generated)
  sw/injector.ts              — SW registration
  sw/generator.js             — Standalone SW rebuild script
  adapters/useCachedFetch.tsx  — React hooks (generated)
  adapters/useMutation.tsx     — React hooks (generated)
  adapters/useAuth.tsx         — React hooks (generated)
  ... (10+ React adapters)
  GUIDE.md                    — Documentation links
```

Every file is generated source code — readable, editable, and committable.

## How competitors handle it

**TanStack Query:**
```
npm install @tanstack/react-query
```
```tsx
// Setup:
const queryClient = new QueryClient();
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RestOfApp />
    </QueryClientProvider>
  );
}

// Per-module:
const { data } = useQuery({
  queryKey: ["notes"],
  queryFn: () => fetch("/api/notes").then(r => r.json()),
});
```
- Runtime library: ~20 kB (minified) in the bundle.
- TypeScript: Built-in types, but query keys are untyped strings.
- Generated code: None. Everything is runtime.
- Config: Code-only. No config file.
- Setup cost: QueryClient + Provider + wrappers for auth, retry, etc.

**Workbox:**
```
npm install workbox-webpack-plugin
```
```js
// webpack.config.js:
new InjectManifest({ swSrc: "./src/sw.js", swDest: "sw.js" });

// src/sw.js — developer writes:
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);
registerRoute(/\/api\//, new StaleWhileRevalidate());
```
- Runtime library: ~30 kB SW modules in the SW.
- Generated code: Only the precache manifest.
- Config: Code-based SW file + build plugin config.
- Setup cost: Install plugin + write SW file + configure routes.

**RxDB:**
```
npm install rxdb
```
```ts
import { createRxDatabase, addRxPlugin } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

const db = await createRxDatabase({
  name: "mydb",
  storage: getRxStorageDexie(),
});

await db.addCollections({
  notes: { schema: noteSchema },
});

await db.notes.insert({ title: "Hello", description: "World" });
```
- Runtime library: ~40 kB gzip.
- Generated code: None. Everything is runtime.
- Config: Schema definitions + DB creation code.
- Setup cost: Schema defs + DB init + replication setup + server adapter.

## Comparison table

| Aspect | Swoff | TanStack Query | Workbox | RxDB |
|---|---|---|---|---|
| **Paradigm** | Config-driven code gen | Runtime library | Runtime library + build plugin | Runtime library |
| **Setup** | 1 config file + CLI | QueryClient + Provider | SW file + build plugin | Schema + DB init + sync setup |
| **Lines of setup code** | 0 (CLI generates everything) | ~10 lines + auth wrapper | ~30 lines SW file + plugin config | ~50 lines schema + DB + sync |
| **Generated code** | ✅ Full source (swoff/ directory) | ❌ None | 🟡 Only precache manifest | ❌ None |
| **Auditable output** | ✅ Every file committable | ❌ Runtime only | 🟡 SW file developer-written | ❌ Runtime only |
| **TypeScript declarations** | ✅ Generated (swoff.d.ts) | ✅ Built-in | ❌ Not generated | ✅ Built-in |
| **Config file** | ✅ swoff.config.json | ❌ Code-only | 🟡 Plugin config + SW code | ❌ Code-only |
| **CLI** | ✅ init, add, generate, clean, assets | ❌ None | 🟡 workbox-cli (limited) | ❌ None |
| **Runtime bundle cost** | 0 kB (generated code) | ~20 kB minified | ~30 kB SW module | ~40 kB gzip |
| **Build tool required** | None (works with any) | None | Webpack/Vite/Rollup plugin | None |
| **Framework adapters** | ✅ React (generated), Vue/Svelte planned | ✅ React, Vue, Svelte, Solid (separate packages) | ❌ Not applicable | ✅ React, Angular, etc. |
| **SW integration** | ✅ Full (gen + injector + rebuild) | ❌ None | ✅ Full (Workbox-based) | ❌ None (manual SW) |
| **SSR-safe** | ✅ All modules guard browser globals | ✅ Yes | N/A (SW only) | N/A (client only) |
| **Migration path** | ✅ Re-run `swoff generate` | 🟡 Update library version + fix breakage | 🟡 Update Workbox version | 🟡 Schema migration + DB version |

## What generated code means in practice

**Debuggability:** When a caching bug occurs, Swoff developers open `swoff/fetch/core.ts` and read the exact code that runs. TanStack Query developers open Chrome DevTools, find the compiled bundle, and step through minified code. Workbox developers find the SW file in DevTools, which contains the Workbox runtime plus the developer's configuration.

**CI/CD:** Swoff's generated files are committed to the repository. PRs include the generated code diff. Code reviewers can see exactly what the generator changed. A failed generator produces a visible diff, not a silent runtime error.

**Version control:** Swoff generates files that match the config. If the config changes, re-running `swoff generate` produces updated files with a clean diff. TanStack Query updates are version bumps in `package.json` — the actual code change is opaque.

**No runtime dependency risk:** Swoff has nothing in `node_modules` at runtime. No version conflicts, no dependency chain issues, no supply chain attacks on the client-side code. All generated code is browser-native JavaScript/TypeScript.


