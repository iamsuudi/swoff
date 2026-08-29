# @swoff/cli

CLI for [Swoff](https://swoff.space) — offline-first web apps made easy.

Swoff generates a **service worker** and **client utilities** from a config file — zero runtime
dependencies, no Workbox, all auditable code. Server-state reactivity, offline queues, PWA install,
push notifications, auth, and cross-tab sync — out of the box.

```bash
npx @swoff/cli init          # create swoff.config.json
npx @swoff/cli generate      # generate swoff/ files
```

### With a bundler (React, Next.js, Vue, Svelte, Astro)

```js
import { fetchWithCache } from "./swoff/fetch/core";
const { response } = await fetchWithCache("/api/todos");
```

### Without a bundler (no-bundler, plain HTML/JS)

```html
<script src="/swoff/client-injector.bundle.js"></script>
<script src="/swoff/swoff-api.bundle.js"></script>
<script>
  swoff.fetchWithCache("/api/todos").then((r) => r.json());
</script>
```

## Features

| Category               | Feature                                             |
| ---------------------- | --------------------------------------------------- |
| Caching                | 6 strategies                                        |
| Mutations              | useState-style tracking, offline queue, concurrency |
| Prefetching            | Cache warming on hover/navigation                   |
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
| `validate`       | Validate `swoff.config.json`                   |
| `clean`          | Remove all generated files and config          |
| `help [command]` | Show help for a specific command               |

For PWA asset generation (icons, splash screens, favicons, manifest.json), use the standalone [`@swoff/assets`](https://github.com/iamsuudi/swoff) package:

```bash
npx @swoff/assets --source ./logo.svg
```

## Documentation

| Guide                                                    | Description                                       |
| -------------------------------------------------------- | ------------------------------------------------- |
| [Config](https://swoff.dev/docs/config)                  | Full config schema and feature reference          |
| [API](https://swoff.dev/docs/api)                        | Client API reference (auth, cache, mutations)     |
| [CLI](https://swoff.dev/docs/cli)                        | CLI commands and options                          |
| [Guides](https://swoff.dev/docs/guides)                  | Step-by-step guides for each feature              |
| [Architecture](https://swoff.dev/docs/architecture)      | Design decisions and rationale                    |
| [Comparisons](https://swoff.dev/docs/comparisons)        | Swoff vs Workbox / Serwist / SWR / TanStack Query |
| [Ecosystem](https://swoff.dev/docs/frameworks/ecosystem) | Framework integration guides                      |

---

## Requirements

- **Node.js >= 18**
- A build tool with a `package.json` build script
- [Secure Context](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) (required for service workers)

---

## License

MIT

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)
