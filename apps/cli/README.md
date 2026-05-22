# @swoff/cli

CLI for [Swoff](https://swoff.netlify.app) — offline-first web apps made easy.

## Install

```bash
npm install --save-dev @swoff/cli
```

## Quick Start

```bash
npx swoff init
npx swoff generate
```

Import the generated SW injector in your app entry point:

```js
import { initServiceWorker, shouldRegisterSW } from './swoff/sw-injector.js';

if (shouldRegisterSW()) initServiceWorker();
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize Swoff in current directory (creates config and `swoff/`) |
| `generate` | Generate service worker and supporting files |
| `validate` | Validate `swoff.config.json` |
| `add <feature>` | Add a specific feature (offline, pwa, mutation-queue, etc.) |
| `info` | Show configuration summary and generated files |
| `clean` | Remove all Swoff files from the project (swoff/, config, version.json) |
| `help` | Show help information |

### Generate Options

- `--sw-only` — regenerate only the service worker
- `--files-only` — regenerate only supporting files (sw-template, sw-injector, etc.)

## Requirements

Node.js >= 18

## License

MIT
