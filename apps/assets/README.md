# @swoff/assets

Universal PWA asset generator. No framework lock-in, no config coupling, no CDN downloads.

```bash
npx @swoff/assets --source ./logo.svg
```

Generates **up to 31 files** in one shot: standard + maskable + monochrome icons, Apple splash screens, favicon (ICO + SVG), OG image, Microsoft tiles, `manifest.json` with full integration, and `swoff-head-tags.html` ready to copy into your `<head>`.

---

## Quick Start

```bash
npx @swoff/assets --source ./logo.svg
```

Opens `./logo.svg`, writes everything to `public/`.

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
  --dark-mode-bg #121212
```

---

## Installation

Use directly without installing:

```bash
npx @swoff/assets --source ./logo.svg
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
Usage: npx @swoff/assets --source <path> [options]
```

### Options

| Flag                      | Default      | Description                                                  |
| ------------------------- | ------------ | ------------------------------------------------------------ |
| `--source <path>`         | _(required)_ | Source image (SVG, PNG, JPG)                                 |
| `--output-dir <path>`     | `public`     | Output directory for generated files                         |
| `--app-name <name>`       | `My App`     | App name used in manifest.json                               |
| `--theme-color <hex>`     | `#000000`    | Theme color for manifest.json and splash screens             |
| `--bg-color <hex>`        | `#ffffff`    | Background color for manifest.json and splash screens        |
| `--no-splash`             | `false`      | Skip Apple splash screen generation                          |
| `--monochrome`            | `false`      | Generate monochrome silhouette icons (`purpose: monochrome`) |
| `--ms-tile-color <hex>`   | —            | Generate Microsoft tile icons + `browserconfig.xml`          |
| `--dark-mode-theme <hex>` | —            | Dark mode theme color (enables dark icon set)                |
| `--dark-mode-bg <hex>`    | `#121212`    | Dark mode background color                                   |
| `--config <path>`         | —            | Path to `swoff-assets.json` config file                      |
| `-v, --version`           |              | Show version                                                 |
| `-h, --help`              |              | Show help                                                    |

---

## Config File

Create `swoff-assets.json` in your project root for repeatable builds. Use `--config <path>` to load from a custom location. CLI flags override config values.

```js
{
  "source": "./logo.svg",
  "outputDir": "public",
  "appName": "My App",
  "themeColor": "#000000",
  "backgroundColor": "#ffffff",
  "monochrome": true,
  "msTileColor": "#000000",
  "darkMode": {
    "themeColor": "#ffffff",
    "backgroundColor": "#121212"
  },
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

| Category                                  | Files                                                                      | Count |
| ----------------------------------------- | -------------------------------------------------------------------------- | ----- |
| **PWA icons**                             | `icon-64.png`, `icon-192.png`, `icon-512.png`                              | 3     |
| **Maskable icons**                        | `maskable-icon-96.png`, `maskable-icon-192.png`, `maskable-icon-512.png`   | 3     |
| **Apple touch**                           | `apple-touch-icon.png` (180×180)                                           | 1     |
| **Monochrome** (if `--monochrome`)        | `monochrome-icon-192.png`, `monochrome-icon-512.png`                       | 2     |
| **Dark mode** (if `--dark-mode-*`)        | `dark-icon-*.png`, `dark-maskable-icon-*.png`, `dark-apple-touch-icon.png` | 8     |
| **MS tiles** (if `--ms-tile-color`)       | `ms-tile-144.png`, `ms-tile-150x150.png`, `ms-tile-310x150.png`, `ms-tile-310x310.png` | 4     |
| **Favicon**                               | `favicon.ico` (16+32+48), `favicon.svg` (SVG source only)                  | 1–2   |
| **OG image**                              | `og-image.png` (1200×630)                                                  | 1     |
| **Splash screens** (7 Apple sizes)        | `splash-2048x2732.png` through `splash-640x1136.png`                       | 7     |
| **Manifest**                              | `manifest.json` — icons, screenshots, shortcuts, theme/bg colors           | 1     |
| **Head tags**                             | `swoff-head-tags.html` — all `<link>` and `<meta>` tags                    | 1     |
| **Browser config** (if `--ms-tile-color`) | `browserconfig.xml`                                                        | 1     |

**Total: up to 31 files.**

### manifest.json integration

The generated `manifest.json` includes:

- **Icons array**: all generated icon paths with correct `sizes`, `type`, and `purpose`
- **Screenshots**: OG image as both `narrow` and `wide` `form_factor`
- **Shortcuts**: from config (in-app navigation shortcuts supported by Chrome)
- **`theme_color`** / **`background_color`**: from your flags or config
- **Dark mode**: `theme_color` switches to dark variant

---

## Features

### Monochrome icons

Silhouette-style icons for use as monochrome badges. Generated from your source image using the theme color. Can be used in the URL bar, multi-window mode, and other single-color contexts.

### Dark mode

Generates a complete parallel set of icons using dark theme/background colors. The `swoff-head-tags.html` includes:

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

---

## Programmatic API

```js
import { generateAssets } from "@swoff/assets";

const result = await generateAssets({
  source: "./logo.svg",
  outputDir: "public",
  appName: "My App",
  themeColor: "#000000",
  bgColor: "#ffffff",
  appleSplash: true,
  monochrome: true,
  msTileColor: "#000000",
  darkMode: {
    themeColor: "#ffffff",
    backgroundColor: "#121212",
  },
  shortcuts: [{ name: "Dashboard", url: "/dashboard" }],
  onProgress: (msg) => console.log(msg),
});

console.log(result.files); // ["public/icon-64.png", "public/manifest.json", ...]
```

### Options

| Field         | Type                    | Default      | Description                             |
| ------------- | ----------------------- | ------------ | --------------------------------------- |
| `source`      | `string`                | _(required)_ | Path to source image                    |
| `outputDir`   | `string`                | `"public"`   | Output directory                        |
| `appName`     | `string`                | `"My App"`   | App name for manifest                   |
| `themeColor`  | `string`                | `"#000000"`  | Theme color hex                         |
| `bgColor`     | `string`                | `"#ffffff"`  | Background color hex                    |
| `appleSplash` | `boolean`               | `true`       | Generate Apple splash screens           |
| `monochrome`  | `boolean`               | `false`      | Generate monochrome icons               |
| `msTileColor` | `string`                | —            | MS tile color (enables tile generation) |
| `darkMode`    | `DarkModeConfig`        | —            | Dark mode icon set                      |
| `shortcuts`   | `ShortcutEntry[]`       | —            | Manifest shortcuts                      |
| `onProgress`  | `(msg: string) => void` | —            | Progress callback                       |

### Result

```ts
interface GenerateResult {
  files: string[]; // Absolute paths of all generated files
  warnings: string[]; // Non-fatal warnings
}
```

---

## Comparison

|                      | `@swoff/assets`                         | `@vite-pwa/assets-generator` | PWABuilder   |
| -------------------- | --------------------------------------- | ---------------------------- | ------------ |
| **Standalone CLI**   | ✅ `npx @swoff/assets`                  | ❌ requires Vite plugin      | ✅ web + CLI |
| **Monochrome icons** | ✅                                      | ❌                           | ❌           |
| **Dark mode icons**  | ✅                                      | ❌                           | ❌           |
| **MS tiles**         | ✅                                      | ❌                           | ❌           |
| **Splash screens**   | ✅ 7 sizes                              | ✅                           | ❌           |
| **manifest.json**    | ✅ full (icons, screenshots, shortcuts) | ❌ partial                   | ✅           |
| **Head tags file**   | ✅ `swoff-head-tags.html`               | ❌                           | ❌           |
| **Config file**      | ✅ `swoff-assets.json`                  | ✅ `pwa-assets.config.js`    | ❌           |
| **Runtime deps**     | `jimp`, `@resvg/resvg-wasm`             | `sharp` (native)             | SDK          |

---

## Requirements

- **Node.js >= 18**
- Source image: SVG (recommended), PNG, or JPG
- No framework, no build tool, no config required

---

## License

MIT

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)
