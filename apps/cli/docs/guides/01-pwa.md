# PWA Foundation (replaces Workbox)

> **If you're coming from Workbox:** Swoff generates a complete, auditable service worker from config — no manual SW code, no runtime Workbox modules bundled into your app. The generated SW is a `.js` file you can read, debug, and commit. See the [full comparison](../comparisons/service-worker.md).

## Preconditions

- Node project with `package.json`
- A `swoff.config.json` (run `npx @swoff/cli init` if you don't have one)

## Enable

PWA is enabled by default after `swoff init`. To add it to an existing config:

```bash
npx @swoff/cli add pwa
```

Or set `features.pwa.enabled: true` in `swoff.config.json`.

## Generated files

| File                            | What it does                                                            | Import in your code?                  |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| `swoff/sw/injector.ts`          | SW registration, version check, auto-update                             | Yes                                   |
| `swoff/pwa/prompt.ts`           | Install prompt listener, `isInstallable()`, `promptInstall()`           | Yes                                   |
| `swoff/pwa/injector.ts`         | Re-exports `setupPwaInstall` from prompt                                | Yes                                   |
| `swoff/pwa/index.ts`            | Barrel re-export of `setupPwaInstall`, `isInstallable`, `promptInstall` | Convenience                           |
| `swoff/sw/template.js`          | The SW source — reads cache strategies, auth, tags from config headers  | No, built into SW                     |
| `swoff/sw/generator.js`         | Build script that produces the final `sw.js`                            | Run: `node swoff/sw/generator.js`     |
| `swoff/sw-version.ts`           | `SW_VERSION` constant — controls cache busting on deploy                | Yes, for debugging                    |
| `swoff/connectivity-manager.ts` | Network status tracking with HEAD heartbeat                             | Yes, if you need online/offline state |

## Usage

```ts
import { initServiceWorker } from "./swoff/sw/injector";
import { setupPwaInstall, isInstallable, promptInstall } from "./swoff/pwa";

// At app startup
initServiceWorker();
setupPwaInstall();

// Show install button when available
if (isInstallable()) {
  const result = await promptInstall();
  // result.outcome === "accepted" | "dismissed"
}
```

## Customize

- **`swoff/pwa/prompt.ts`** — `setupPwaInstall()` handler. Set `preventDefaultInstall: true` in config to customize the install prompt UI.

## Config

```json
{
  "features": {
    "pwa": {
      "enabled": true,
      "preventDefaultInstall": false
    },
    "serviceWorker": {
      "version": "package",
      "autoActivate": false
    }
  }
}
```

- `pwa.enabled` — generate PWA install prompt and injector
- `pwa.preventDefaultInstall` — capture the browser's install event without showing it; show your own UI
- `serviceWorker.version` — `"package"` (from package.json), `"hash"` (content-hashed), or `"manual"` (you edit `swoff/sw-version.ts`)
- `serviceWorker.autoActivate` — skip waiting and activate new SW immediately

## Build the SW

```bash
node swoff/sw/generator.js
```

Add this to your build script. It reads the config headers from generated files and produces your final `sw.js`.

## Related

- [Full comparison: Swoff vs Workbox / Serwist](../comparisons/service-worker.md)
- [Config reference](../CONFIG.md#featurespwa)
