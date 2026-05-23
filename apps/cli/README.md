# @swoff/cli

CLI for [Swoff](https://swoff.netlify.app) — offline-first web apps made easy.

## Quick Start

```bash
npx @swoff/cli init
npx @swoff/cli generate
```

Import the generated SW injector in your app entry point:

```js
import { initServiceWorker } from './swoff/sw-injector.js';

initServiceWorker();
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `swoff.config.json` and `swoff/` directory |
| `generate` | Generate service worker and supporting files |
| `validate` | Validate `swoff.config.json` |
| `add <feature>` | Enable a feature and regenerate |
| `info` | Show configuration summary and generated files |
| `clean` | Remove all Swoff files (swoff/, config, version.json) |
| `help` | Show help information |

### Generate Options

| Flag | Description |
|------|-------------|
| `--sw-only` | Regenerate only the service worker |
| `--files-only` | Regenerate only supporting files (sw-template, sw-injector, etc.) |

### Available Features

| Feature | Description |
|---------|-------------|
| `mutation-queue` | Queue offline writes and sync when back online |
| `pwa` | PWA installability (install prompt, manifest) |
| `cross-tab` | Cross-tab cache invalidation sync |
| `auth` | Auth integration (cookie/bearer/custom) |
| `tag-invalidation` | Tag-based cache invalidation |
| `background-sync` | Background Sync API (Chrome/Edge) |
| `indexeddb` | IndexedDB storage patterns |
| `offline` | Offline support infrastructure |

## Requirements

Node.js >= 18

## License

MIT
