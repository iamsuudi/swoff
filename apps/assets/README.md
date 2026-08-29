# @swoff/assets — The Most Comprehensive PWA Asset Generator

[Swoff](https://swoff.space/assets) — Universal PWA asset generator. No framework lock-in, no config coupling, no CDN downloads.

```bash
npx @swoff/assets --app-name "My App"
```

Generates **36 files by default and up to 50** in one shot: standard + maskable + monochrome icons, Apple splash screens, Android adaptive icons, favicon (ICO + SVG), OG image, Microsoft tiles, `manifest.json` with full integration, `swoff-head-tags.html` ready to copy into your `<head>`, and a self-contained `pwa-debug.html` audit page. No source image? A wordmark icon is generated from `--app-name`.

---

## Quick Start

```bash
npx @swoff/assets --app-name "My App"
```

Writes everything to `public/`. Provide `--source` to use your own logo instead:

```bash
npx @swoff/assets --source ./logo.svg
```

### With options

```
npx @swoff/assets \
  --source ./logo.svg \
  --app-name "My App" \
  --theme-color #663399 \
  --bg-color #ffffff \
  --monochrome \
  --ms-tile-color #663399 \
  --dark-mode-theme #ffffff \
  --dark-mode-bg #121212 \
  --orientation landscape \
  --scope /app \
  --lang en-US \
  --categories productivity,developer-tools
```

---

## Installation

Use directly without installing:

```bash
npx @swoff/assets --app-name "My App"
```

Or install as a dev dependency:

```bash
bun add -D @swoff/assets
npm install -D @swoff/assets
```

Then run via `package.json` scripts:

```json
{
  "scripts": {
    "assets": "swoff-assets --source ./logo.svg"
  }
}
```

---

## CLI Reference

```
Usage: npx @swoff/assets --app-name <name> [options]
```

A wordmark icon is generated from `--app-name` when `--source` is omitted.

### Options

| Flag                      | Default             | Description                                                        |
| ------------------------- | ------------------- | ------------------------------------------------------------------ |
| `--source <path>`         | _(wordmark)_        | Source image (SVG, PNG, JPG). Omit to auto-generate a wordmark icon |
| `--output-dir <path>`     | `public`            | Output directory for generated files                               |
| `--app-name <name>`       | `My App`            | App name used in manifest.json and wordmark icons                  |
| `--short-name <name>`     | `app-name`          | Short name for manifest.json                                       |
| `--description <text>`    | —                   | Description for manifest.json                                      |
| `--start-url <path>`      | `/`                 | Start URL and manifest id                                          |
| `--theme-color <hex>`     | `#000000`           | Theme color for manifest.json, icons, and splash screens           |
| `--bg-color <hex>`        | `#ffffff`           | Background color for manifest.json and splash screens              |
| `--no-splash`             | `false`             | Skip Apple splash screen generation                                |
| `--monochrome`            | `false`             | Generate monochrome silhouette icons (`purpose: monochrome`)       |
| `--ms-tile-color <hex>`   | —                   | Generate Microsoft tile icons + `browserconfig.xml`                |
| `--dark-mode-theme <hex>` | `theme-color`       | Dark mode theme color (enables dark icon set)                      |
| `--dark-mode-bg <hex>`    | `#121212`           | Dark mode background color                                         |
| `--orientation <value>`   | `portrait-primary`  | manifest.json orientation                                          |
| `--scope <path>`          | `/`                 | manifest.json scope                                                |
| `--lang <tag>`            | `en-US`             | manifest.json lang                                                 |
| `--categories <list>`     | `utilities, web`    | manifest.json categories, comma separated                          |
| `--config <path>`         | —                   | Path to `swoff-assets.json` config file                            |
| `--print-schema`          |                     | Print the `swoff-assets.json` JSON schema                          |
| `-v, --version`           |                     | Show version                                                       |
| `-h, --help`              |                     | Show help                                                          |

---

## Config File

Create `swoff-assets.json` in your project root for repeatable builds. Use `--config <path>` to load from a custom location. CLI flags override config values — run `npx @swoff/assets --print-schema` for the full shape.

```js
{
  "source": "./logo.svg",
  "outputDir": "public",
  "appName": "My App",
  "shortName": "My App",
  "description": "Your app description",
  "startUrl": "/",
  "themeColor": "#000000",
  "backgroundColor": "#ffffff",
  "monochrome": true,
  "msTileColor": "#000000",
  "darkMode": {
    "themeColor": "#ffffff",
    "backgroundColor": "#121212"
  },
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en-US",
  "categories": ["utilities", "web"],
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "description": "Quick access to dashboard"
    },
    {
      "name": "Settings",
      "url": "/settings"
    }
  ]
}
```

---

## Generated Files

| Category                            | Files                                                                                             | Count |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ----- |
| **PWA icons**                       | `icon-64.png`, `icon-192.png`, `icon-512.png`                                                     | 3     |
| **Maskable icons**                  | `maskable-icon-96.png`, `maskable-icon-192.png`, `maskable-icon-512.png`                          | 3     |
| **Apple touch**                     | `apple-touch-icon.png` (180×180)                                                                  | 1     |
| **Android adaptive** (always-on)    | `mipmap-{mdpi…xxxhdpi}/ic_launcher.png`, `ic_launcher_round.png`, foreground/monochrome layers, `mipmap-anydpi-v26` XMLs, `values/colors.xml`, install note | 16    |
| **Favicon**                         | `favicon.ico` (16+32+48), `favicon.svg` (base64 PNG embedded for raster sources)                  | 2     |
| **OG image**                        | `og-image.png` (1200×630)                                                                         | 1     |
| **Splash screens** (7 Apple sizes)  | `splash-2048x2732.png` through `splash-640x1136.png`                                              | 7     |
| **Manifest**                        | `manifest.json` — icons, screenshots, shortcuts, theme/bg colors, orientation, scope, lang, categories | 1 |
| **Head tags**                       | `swoff-head-tags.html` — all `<link>` and `<meta>` tags                                           | 1     |
| **Audit page**                      | `pwa-debug.html` — self-contained, dependency-free asset audit from the browser                   | 1     |
| **Monochrome** (if `--monochrome`)  | `monochrome-icon-192.png`, `monochrome-icon-512.png`                                              | 2     |
| **Dark mode** (if `--dark-mode-*`)  | `dark-icon-*.png`, `dark-maskable-icon-*.png`, `dark-apple-touch-icon.png`                        | 7     |
| **MS tiles** (if `--ms-tile-color`) | `ms-tile-144.png`, `ms-tile-150x150.png`, `ms-tile-310x150.png`, `ms-tile-310x310.png`            | 4     |
| **Browser config** (if `--ms-tile-color`) | `browserconfig.xml`                                                                          | 1     |

**Total: 36 files by default, up to 50 with monochrome + MS tiles + dark mode.**

### manifest.json integration

The generated `manifest.json` includes:

- **Icons array**: all generated icon paths with correct `sizes`, `type`, and `purpose`
- **Screenshots**: OG image as `wide` `form_factor`
- **Shortcuts**: from config (in-app navigation shortcuts supported by Chrome)
- **`theme_color`** / **`background_color`**: from your flags or config
- **Dark mode**: `theme_color` switches to dark variant
- **`orientation`**, **`scope`**, **`lang`**, **`categories`**: mapped straight through from flags or config
- **`id`**, **`start_url`**, **`display`**, **`display_override`**, **`prefer_related_applications`**

---

## Features

### Wordmark icons (no source required)

Omit `--source` and a text-derived icon is generated from `--app-name`: a rounded-rect tile with the app's initial (or up to 8 characters) set in the theme color. Rasterized through the same resvg pipeline used for SVG sources; falls back to a bitmap-font monogram when no system fonts are available.

### Android adaptive icons

Always generated: density-scaled `ic_launcher` / `ic_launcher_round` PNGs (mdpi → xxxhdpi), 216px foreground (66% safe zone), monochrome layer, `mipmap-anydpi-v26` launcher XMLs, and `values/colors.xml` using your background color. Drop the `mipmap-*` and `values/` folders into a native or WebView wrapper (e.g. Trusted Web Activity).

### pwa-debug.html audit page

A self-contained, dependency-free page that verifies your generated set from the browser — manifest validity, icon size/purpose checks, head-tag references, splash presence, and a `<meta name="theme-color">` check. Open it on your deployed app (or localhost) to audit installability.

### Monochrome icons

Silhouette-style icons for use as monochrome badges. Generated from your source image using the theme color. Can be used in the URL bar, multi-window mode, and other single-color contexts.

### Dark mode

Generates a complete parallel set of icons using dark theme/background colors (a missing dark theme inherits the regular `theme-color`; the background defaults to `#121212`). The `swoff-head-tags.html` includes:

- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (light)
- `<link rel="apple-touch-icon" href="/dark-apple-touch-icon.png" media="(prefers-color-scheme: dark)">` (dark)
- `<meta name="theme-color">` with `media="(prefers-color-scheme: dark)"` for the dark variant

### Microsoft tiles

When `--ms-tile-color` is provided, generates:

- `ms-tile-144.png`, `ms-tile-150x150.png`, `ms-tile-310x150.png`, `ms-tile-310x310.png`
- `browserconfig.xml` with tile references
- Meta tags in `swoff-head-tags.html`

### Apple splash screens

7 launch screens covering all modern iOS device sizes. Loaded via `<link rel="apple-touch-startup-image">` with device-specific media queries. They eliminate the white flash when launching a PWA from the iOS home screen.

### Web manifest shortcuts

Configurable in-app navigation shortcuts declared in `manifest.json`. Supported by Chrome on Android — long-press the app icon to jump directly to specific routes.

### Validation warnings

Invalid color hexes, undersized sources, non-root-relative `start_url`s, and overly long app names produce non-fatal warnings instead of silently generating wrong output.

---

## Programmatic API

```js
import { generateAssets } from "@swoff/assets";

const result = await generateAssets({
  outputDir: "public", // source is optional — wordmark is generated
  appName: "My App",
  source: "./logo.svg",
  themeColor: "#000000",
  bgColor: "#ffffff",
  appleSplash: true,
  monochrome: true,
  msTileColor: "#000000",
  darkMode: {
    themeColor: "#ffffff",
    backgroundColor: "#121212",
  },
  orientation: "landscape",
  scope: "/",
  lang: "en-US",
  categories: ["productivity"],
  shortcuts: [{ name: "Dashboard", url: "/dashboard" }],
  onProgress: (msg) => console.log(msg),
});

console.log(result.files); // ["public/icon-64.png", "public/manifest.json", ...]
console.log(result.warnings); // non-fatal problems worth attention
```

### Options

| Field         | Type                          | Default        | Description                             |
| ------------- | ----------------------------- | -------------- | --------------------------------------- |
| `source`      | `string`                      | —              | Path to source image (wordmark if omitted) |
| `outputDir`   | `string`                      | `"public"`     | Output directory                        |
| `appName`     | `string`                      | `"My App"`     | App name for manifest + wordmark        |
| `shortName`   | `string`                      | `appName`      | Short name for manifest                 |
| `description` | `string`                      | —              | Description for manifest                |
| `startUrl`    | `string`                      | `"/"`          | Start URL and manifest id               |
| `themeColor`  | `string`                      | `"#000000"`    | Theme color hex                         |
| `bgColor`     | `string`                      | `"#ffffff"`    | Background color hex                    |
| `appleSplash` | `boolean`                     | `true`         | Generate Apple splash screens           |
| `monochrome`  | `boolean`                     | `false`        | Generate monochrome icons               |
| `msTileColor` | `string`                      | —              | MS tile color (enables tile generation) |
| `darkMode`    | `DarkModeConfig`              | —              | Dark mode icon set                      |
| `orientation` | `string`                      | `"portrait-primary"` | manifest.json orientation         |
| `scope`       | `string`                      | `"/"`          | manifest.json scope                     |
| `lang`        | `string`                      | `"en-US"`      | manifest.json lang                      |
| `categories`  | `string[]`                    | `["utilities", "web"]` | manifest.json categories       |
| `shortcuts`   | `ShortcutEntry[]`             | —              | Manifest shortcuts                      |
| `onProgress`  | `(msg: string) => void`       | —              | Progress callback                       |

### Result

```ts
interface GenerateResult {
  files: string[]; // Absolute paths of all generated files
  warnings: string[]; // Non-fatal warnings
  wordmarkFallback?: boolean; // True when the wordmark used the bitmap-font fallback
}
```

---

## Comparison

|                      | `@swoff/assets`                         | `@vite-pwa/assets-generator` | PWABuilder   |
| -------------------- | --------------------------------------- | ---------------------------- | ------------ |
| **Standalone CLI**   | ✅ `npx @swoff/assets`                  | ❌ requires Vite plugin      | ✅ web + CLI |
| **Wordmark auto**    | ✅ no source needed                     | ❌                           | ❌           |
| **Android adaptive** | ✅ always-on                            | ❌                           | ✅           |
| **Monochrome icons** | ✅                                      | ❌                           | ❌           |
| **Dark mode icons**  | ✅                                      | ❌                           | ❌           |
| **MS tiles**         | ✅                                      | ❌                           | ❌           |
| **Splash screens**   | ✅ 7 sizes                              | ✅                           | ❌           |
| **manifest.json**    | ✅ full (icons, screenshots, shortcuts, orientation, scope, lang) | ❌ partial | ✅ |
| **Head tags file**   | ✅ `swoff-head-tags.html`               | ❌                           | ❌           |
| **Audit page**       | ✅ `pwa-debug.html`                     | ❌                           | ❌           |
| **Config file**      | ✅ `swoff-assets.json` + JSON schema    | ✅ `pwa-assets.config.js`    | ❌           |
| **Runtime deps**     | `jimp`, `@resvg/resvg-wasm`            | `sharp` (native)             | SDK          |

---

## Requirements

- **Node.js >= 18**
- Source image (optional): SVG (recommended), PNG, or JPG
- No framework, no build tool, no config required

---

## License

MIT

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)