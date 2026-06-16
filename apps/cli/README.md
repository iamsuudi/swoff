# @swoff/cli

CLI for [Swoff](https://swoff.netlify.app) — offline-first web apps made easy.

Swoff generates a **service worker** and **client utilities** from a config file — zero runtime
dependencies, no Workbox, all auditable code. Server-state reactivity, offline queues, PWA install,
push notifications, auth, and cross-tab sync — out of the box.

```bash
npx @swoff/cli init          # create swoff.config.json
npx @swoff/cli generate      # generate swoff/ files
```

Then wire it up:

```js
import { initServiceWorker } from "./swoff/client-injector";
initServiceWorker();
```

## Features

| Category               | Feature                                             |
| ---------------------- | --------------------------------------------------- |
| Caching                | 6 strategies                                        |
| Mutations              | useState-style tracking, offline queue, concurrency |
| Prefetching            | Cache warming on hover/navigation                   |
| Dependent queries      | enabled option, nullable URL                        |
| Query cancellation     | AbortController integration                         |
| Real-time invalidation | SSE / WebSocket push events                         |
| Tag invalidation       | URL-derived cache tags                              |
| Auth                   | memory-only tokens, bearer/cookie/custom            |
| GraphQL                | body-hash caching, auto-tags                        |
| PWA                    | install prompt, manifest, SW update hooks           |
| Push notifications     | VAPID subscription management                       |
| Background Sync        | process mutations after tab close                   |
| Cross-tab sync         | broadcast invalidation across tabs                  |

## CLI Commands

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `init`           | Create `swoff.config.json` with auto-detection |
| `generate`       | Generate SW + all supporting files             |
| `add <feature>`  | Enable a feature and regenerate                |
| `validate`       | Validate `swoff.config.json`                   |
| `info [feature]` | Show summary or per-feature details            |
| `clean`          | Remove all generated files and config          |
| `help [command]` | Show help for a specific command               |

For PWA asset generation (icons, splash screens, favicons, manifest.json), use the standalone [`@swoff/assets`](https://github.com/iamsuudi/swoff) package:

```bash
npx @swoff/assets --source ./logo.svg
```

## Documentation

| Guide                   | Description                                        |
| ----------------------- | -------------------------------------------------- |
| [Config](./docs/CONFIG.md)           | Full config schema and feature reference |
| [API](./docs/API.md)                 | Client API reference (auth, cache, mutations) |
| [CLI](./docs/CLI.md)                 | CLI commands and options |
| [Guides](./docs/guides)              | Step-by-step guides for each feature |
| [Architecture](./docs/ARCHITECTURE.md) | Design decisions and rationale |
| [Comparison](./docs/COMPARISON.md)    | Swoff vs Workbox / Serwist / SWR / TanStack Query |
| [Ecosystem](./docs/ECOSYSTEM.md)      | Framework integration guides |

---

## Requirements

- **Node.js >= 18**
- A build tool with a `package.json` build script
- [Secure Context](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) (required for service workers)

---

## License

MIT

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)
