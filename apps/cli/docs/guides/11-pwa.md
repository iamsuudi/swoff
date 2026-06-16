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
| `swoff/pwa/prompt.ts`           | Install prompt listener, `isInstallable()`, `promptInstall()`           | Yes                                   |
| `swoff/pwa/injector.ts`         | Re-exports `setupPwaInstall` from prompt (called automatically)         | No — internal to client-injector      |
| `swoff/sw/template.js`          | The SW source — reads cache strategies, auth, tags from config headers  | No, built into SW                     |
| `swoff/sw/generator.js`         | Build script that produces the final `sw.js`                            | Run: `node swoff/sw/generator.js`     |
| `swoff/sw/version.ts`           | `SW_VERSION` constant — controls cache busting on deploy                | Yes, for debugging                    |
| `swoff/connectivity.ts`         | Network status tracking with HEAD heartbeat                             | Yes, if you need online/offline state |

## Usage

```ts
import { initServiceWorker } from "./swoff/client-injector";
import { isInstallable, promptInstall } from "./swoff/pwa/prompt";

// At app startup — also wires up PWA install handler automatically
initServiceWorker();

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
- `serviceWorker.version` — `"package"` (from package.json), `"hash"` (content-hashed), or `"manual"` (you edit `swoff/sw/version.ts`)
- `serviceWorker.autoActivate` — skip waiting and activate new SW immediately

## Build the SW

```bash
node swoff/sw/generator.js
```

Add this to your build script. It reads the config headers from generated source files and produces your final `sw.js`.

## React adapters

Swoff generates these hooks for PWA-related features (import from `./swoff/adapters`):

```tsx
import { usePwaInstall } from "./swoff/adapters/usePwaInstall";
import { useSWUpdate } from "./swoff/adapters/useSWUpdate";
import { useStorageEstimate } from "./swoff/adapters/useStorageEstimate";

function App() {
  const { canInstall, install } = usePwaInstall();
  const { status, progress } = useSWUpdate();
  const { usage, quota, percentUsed } = useStorageEstimate();

  return (
    <div>
      {status === "installing" && <div>Updating SW… {progress}%</div>}
      {canInstall && <button onClick={install}>Install App</button>}
      <div>Cache: {percentUsed.toFixed(1)}% used</div>
    </div>
  );
}
```

## Related

- [Full comparison: Swoff vs Workbox / Serwist](../comparisons/service-worker.md)
- [Config reference](../CONFIG.md#featurespwa)
