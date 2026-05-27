# @swoff/cli

CLI for [Swoff](https://swoff.netlify.app) — offline-first web apps made easy.

Swoff generates a **service worker** and **client-side utilities** that give your web app
server-state reactivity (stale-while-revalidate, auto-refetch, mutation tracking, dedup),
offline support, and PWA features — **zero runtime dependencies**, all generated and auditable.

```bash
npx @swoff/cli init          # create swoff.config.json
npx @swoff/cli generate      # generate service worker + client files
```

Then import the single entry point:

```js
import { initServiceWorker } from "./swoff/client-injector.js";
initServiceWorker();
```

---

## Features

| Category | Feature | API | Architecture |
|----------|---------|-----|--------------|
| Caching | staleTime, auto-refetch, 5 strategies | [API: fetch-wrapper](./docs/API.md#fetch-wrapperts) | [Arch: staleTime + 3-tier](./docs/ARCHITECTURE.md#staletime-fresh-vs-stale-data) |
| Mutations | useState-style tracking, offline queue, concurrency | [API: mutation-state + mutation-queue](./docs/API.md#mutation-statets) | [Arch: queue concurrency](./docs/ARCHITECTURE.md#mutation-queue-concurrency) |
| Prefetching | Cache warming on hover/navigation | [API: usePrefetch](./docs/API.md#useprefetch) | — |
| Dependent queries | enabled option, nullable URL | [API: useCachedFetch](./docs/API.md#usecachedfetcht-url-options) | — |
| Query cancellation | AbortController integration | [API: fetch-wrapper options](./docs/API.md#fetchwithcachet-input-options) | [Arch: dedup map](./docs/ARCHITECTURE.md#dedup-map--abortcontroller) |
| Real-time invalidation | SSE / WebSocket push events | [API: server-push](./docs/API.md#server-pushts) | [Arch: SSE vs WS](./docs/ARCHITECTURE.md#server-push-transport-sse-vs-websocket) |
| Tag invalidation | URL-derived cache tags | [API: invalidation-tags](./docs/API.md#invalidation-tagsts) | — |
| Auth | memory-only tokens, bearer/cookie/custom | [API: auth module](./docs/API.md#auth-module) | [Arch: security](./docs/ARCHITECTURE.md#auth-memory-only-tokens) |
| GraphQL | body-hash caching, auto-tags | [API: gql-wrapper](./docs/API.md#gql-wrapperts) | [Arch: body-hash](./docs/ARCHITECTURE.md#body-hash-graphql-caching) |
| PWA | install prompt, manifest, SW update hooks | [API: pwa](./docs/API.md#pwainstallts) | — |
| Push notifications | VAPID subscription management | [API: push](./docs/API.md#pushts) | — |
| Background Sync | process mutations after tab close | [API: background-sync](./docs/API.md#background-syncts) | — |
| Cross-tab sync | broadcast invalidation across tabs | handled by client-injector | — |

---

## CLI Commands

| Command | Description | Details |
|---------|-------------|---------|
| `init` | Create `swoff.config.json` with auto-detection | [CLI: init](./docs/CLI.md#init) |
| `generate` | Generate SW + all supporting files | [CLI: generate](./docs/CLI.md#generate) |
| `add <feature>` | Enable a feature and regenerate | [CLI: add](./docs/CLI.md#add-feature) |
| `validate` | Validate `swoff.config.json` | [CLI: validate](./docs/CLI.md#validate) |
| `info [feature]` | Show summary or per-feature details | [CLI: info](./docs/CLI.md#info-feature) |
| `clean` | Remove all generated files and config | [CLI: clean](./docs/CLI.md#clean) |
| `help [command]` | Show help for a specific command | [CLI: help](./docs/CLI.md#help-command) |

---

## Configuration

Create `swoff.config.json` with `swoff init`, then tweak as needed.
Full schema reference in [docs/CONFIG.md](./docs/CONFIG.md).

---

## Requirements

- **Node.js >= 18**
- A build tool with a `package.json` build script (Vite, Webpack, etc.)
- **HTTPS or localhost** (required for service workers)

---

## License

MIT

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)
