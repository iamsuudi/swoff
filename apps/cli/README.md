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
import { initServiceWorker } from "swoff/client-injector.js";
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

## Configuration

Create `swoff.config.json` with `swoff init`, then tweak as needed.
Full schema reference in [docs/CONFIG.md](./docs/CONFIG.md).

## API Reference

Read the [API reference](./docs/API.md) for detailed information on each API.

## CLI Reference

Read the [CLI reference](./docs/CLI.md) for detailed information on each command.

## Architecture

Read the [architecture](./docs/ARCHITECTURE.md) for detailed information on the project's architecture.

## Comparison With Other Popular Tools

Read the [comparison](./docs/COMPARISON.md) for a comprehensive comparison with popular tools.

## Ecosystem

Read the [ecosystem](./docs/ECOSYSTEM.md) to see how swoff integrates with any web framework you can work with.

---

## Requirements

- **Node.js >= 18**
- A build tool with a `package.json` build script
- [Secure Context](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) (required for service workers)

---

## License

MIT

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)
