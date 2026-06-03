# PWA: Swoff vs vite-plugin-pwa / Workbox

Progressive Web App features — manifest generation, install prompts, push notifications — are often bolted on separately from caching infrastructure. Swoff integrates them into the same config-driven code generation pipeline as caching, auth, and data fetching.

## How Swoff does it

Swoff generates the full PWA surface from a single config:

```jsonc
{
  "features": {
    "pwa": {
      "enabled": true,
      "appName": "My App",
      "appShortName": "MyApp",
      "description": "Offline-first PWA",
      "themeColor": "#0f172a",
      "backgroundColor": "#ffffff",
      "display": "standalone",
      "orientation": "portrait-primary",
      "scope": "/",
      "startUrl": "/",
      "icon": "./public/icon.svg",
      "iconSizes": [192, 512]
    },
    "pushNotifications": {
      "enabled": true,
      "vapidPublicKey": "BG..."
    }
  }
}
```

**Generated files:**
- `manifest.json` — Web app manifest with icons, display, theme color, orientation.
- `pwa/index.ts` — Barrel export for `isInstallable()` and `promptInstall()`.
- `pwa/prompt.ts` — Install prompt management with `beforeinstallprompt` event capture.
- `pwa/injector.ts` — PWA setup wired into the client-injector.
- `sw/template.js` — Push event listeners (push, notificationclick) in the SW.
- App icons — Generated via the `swoff assets` command (`jimp` + `resvg-wasm`).

**Reactive hook:**
```tsx
import { isInstallable, promptInstall } from "../../swoff/pwa/index";

function InstallButton() {
  const [installable, setInstallable] = useState(() => isInstallable());

  useEffect(() => {
    window.addEventListener("pwa-installable", () => setInstallable(true));
    window.addEventListener("pwa-installed", () => setInstallable(false));
    return () => { /* cleanup */ };
  }, []);

  if (!installable) return null;
  return <button onClick={promptInstall}>Install App</button>;
}
```

## How competitors handle it

**vite-plugin-pwa:** Wraps Workbox and adds Vite-specific manifest generation. Handles precaching of build assets and basic SW configuration through the Vite plugin config. Provides a `useRegisterSW` hook for SW update management. Requires Vite and wraps Workbox's SW runtime.

**Workbox alone:** No PWA manifest generation, no install prompt management, no push notification handling. Workbox is a SW caching toolkit — PWA features are outside its scope.

**Web app manifest:** Can be written manually as a static JSON file. No integration with SW generation, no icon generation, no reactive install prompt hooks.

## Comparison table

| Feature | Swoff | vite-plugin-pwa | Workbox | Manual |
|---|---|---|---|---|
| **Manifest generation** | ✅ From config JSON | ✅ From Vite plugin config | ❌ Not supported | ✅ Write manifest.json manually |
| **Icon generation** | ✅ `swoff assets` command (jimp + resvg) | ❌ External tool needed | ❌ Not supported | ❌ External tool needed |
| **Install prompt** | ✅ `beforeinstallprompt` captured, `isInstallable()`, `promptInstall()` | ❌ Not supported | ❌ Not supported | ✅ Manual `beforeinstallprompt` listener |
| **Push notifications** | ✅ SW push + notificationclick handlers generated | ❌ Not supported | ❌ Not supported | ✅ Manual SW push handlers |
| **Reactive hooks** | ✅ `isInstallable()`, `promptInstall()` | 🟡 `useRegisterSW` (update only) | ❌ Not supported | ❌ Not supported |
| **SW integration** | ✅ PWA events handled in SW template | ✅ SW generated via Workbox | ✅ Manual SW code | ❌ Manual SW code |
| **Config-driven** | ✅ Single swoff config | 🟡 Vite plugin config | ❌ Code-based | ❌ Manual |
| **Cross-framework** | ✅ Any framework or none | ❌ Vite only | ✅ Any build tool | ✅ Any setup |
| **Bundle cost** | 0 kB (generated code) | ~35 kB (Workbox + plugin) | ~30 kB (Workbox) | N/A |

## When to choose what

**Choose Swoff when:**
- You want PWA features to come from the same config as caching and auth
- You need icon generation built into the toolchain
- You want reactive install prompts without writing `beforeinstallprompt` listeners
- You use any build tool (not just Vite)
- You want push notification handlers generated in the SW

**Choose vite-plugin-pwa when:**
- You're already on Vite and want a quick `npm install` solution
- You only need basic PWA manifest + precaching (no install prompts, no push)
- You're comfortable with Workbox's SW runtime modules

**Choose manual when:**
- You need full control over the manifest and SW event handlers
- You're not using a build tool that integrates with Workbox
- PWA features are not a priority (simple manifest.json suffices)
