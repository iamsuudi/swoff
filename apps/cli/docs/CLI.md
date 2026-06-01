# CLI Reference

Full documentation for every `@swoff/cli` command and flag.

## `init`

Creates `swoff.config.json` in your project root. Auto-detects:

- **Framework**: checks for react, vue, svelte dependencies in `package.json`; defaults to `"vanilla"`

```
swoff init
swoff init --framework react   # override auto-detection
```

| Flag | Type | Description |
|------|------|-------------|
| `--framework` | `"react"` \| `"vue"` \| `"svelte"` \| `"vanilla"` | Override framework auto-detection |
| `--logo-source` | `string` | Path to a logo file (SVG/PNG/JPG) for PWA asset generation. Stored in `features.pwa.assets.source`. |

---

## `generate`

Generates the service worker and all supporting files into `swoff/`.

```
swoff generate
swoff generate --sw-only      # regenerate only the service worker
swoff generate --files-only   # regenerate only supporting files (not SW)
```

| Flag | Description |
|------|-------------|
| `--sw-only` | Skip all client-side files; regenerate only `sw/template.js`, `sw/injector.ts`, `sw/generator.js` |
| `--files-only` | Skip SW regeneration; regenerate all client-side files (fetch-wrapper, hooks, etc.) |
| `--language` | `"ts"` \| `"js"` — override language auto-detection; forces `.tsx`/`.ts` or `.jsx`/`.js` output |

After generation, read `swoff/GUIDE.md` for documentation links.

### What is generated

All files land in `swoff/`. See [API.md](./API.md) for the full reference.

| File | Condition | Purpose |
|------|-----------|---------|
| `client-injector.ts` | always | Single entry point — wires SW registration, PWA install, mutation queue, cross-tab sync |
| `fetch-wrapper.ts` | always | Unified fetch with caching, auth, offline queue, auto-invalidation |
| `mutation-queue.ts` | `mutationQueue.enabled` | Offline write queue in IndexedDB |
| `mutation-state.ts` | `mutationQueue.enabled` | Per-mutation status tracking |
| `server-push.ts` | `serverPush.enabled` | Client-side SSE/WebSocket connection manager |
| `cache.ts` | `tagInvalidation` | Low-level `invalidateByTag()` / `invalidateByTags()` |
| `invalidation-tags.ts` | `tagInvalidation` | Tag generation helpers from URL paths |
| `gql-wrapper.ts` | `graphql.enabled` | GraphQL wrapper with body-hash caching |
| `push.ts` | `pushNotifications.enabled` | Push notification subscription management |
| `background-sync.ts` | `backgroundSync` | Background Sync API registration |
| `auth/store.ts` | `auth.enabled` | Token/user persistence + auth header helpers |
| `auth/user.ts` | `auth.enabled` | User data caching |
| `auth/state.ts` | `auth.enabled` | Online/offline × auth state detection |
| `pwa/install.ts` | `pwa.enabled` | Install prompt handling |
| `hooks/*.tsx` | framework === "react" | React hooks (see [API.md](./API.md#react-hooks)) |
| `sw/template.js` | always | Service worker source — runs in SW scope |
| `sw/injector.ts` | always | SW registration logic |
| `sw/generator.js` | always | Build-time script — embeds asset hashes |
| `swoff.d.ts` | always | TypeScript declarations |
| `GUIDE.md` | always | Documentation links and quick-start info |
| `manifest.json` | `pwa.enabled` | Web app manifest |
| `reset.ts` | always | `resetSwoff()` — wipes caches, IndexedDB databases, localStorage, unregisters SW, re-registers via `initServiceWorker` |
| `fetch-state.ts` | always | Global fetch counter (`incrementFetchCount`/`decrementFetchCount`/`getFetchCount`) with `fetch-count-changed` custom events |

### PWA assets

When `features.pwa.enabled` is `true` and `features.pwa.assets.source` is configured, `swoff generate`
automatically generates the following assets from the source logo:

| File | Description |
|------|-------------|
| `public/icon-64.png` | Small PWA icon (64×64) |
| `public/icon-192.png` | Standard PWA icon (192×192) |
| `public/icon-512.png` | Large PWA icon (512×512) |
| `public/maskable-icon-512.png` | Maskable PWA icon (512×512) with safe zone padding |
| `public/apple-touch-icon.png` | Apple touch icon (180×180) |
| `public/favicon.ico` | Multi-size favicon (16×16, 32×32, 48×48) |
| `public/og-image.png` | Open Graph / social sharing image (1200×630) with centered logo |
| `public/splash-*.png` | Apple splash screens (7 sizes for all iOS devices) |

The generated assets are automatically patched into `manifest.json` and `index.html`.

---

## `generate-assets`

Regenerates PWA assets from a source image without re-running the full generator.

```
swoff generate-assets --source ./logo.svg
swoff generate-assets --source ./logo.png --no-splash
```

| Flag | Description |
|------|-------------|
| `--source` | Path to source image (SVG/PNG/JPG). Overrides `features.pwa.assets.source` if set. |
| `--no-splash` | Skip Apple splash screen generation |

If `--source` is omitted, uses `features.pwa.assets.source` from config.

---

## `add <feature>`

Enables a feature in `swoff.config.json` and immediately regenerates.

```
swoff add pwa
swoff add mutation-queue
swoff add auth
swoff add tag-invalidation
swoff add cross-tab
swoff add background-sync
swoff add push-notification
swoff add gql-wrapper
swoff add server-push
```

For object-type features (auth, mutation-queue, graphql, push-notifications, server-push),
this sets `enabled: true` with defaults. Tweak the config file afterwards for fine-grained options.

---

## `validate`

Validates `swoff.config.json` against the schema. Reports unknown fields, type mismatches,
and structural errors.

```
swoff validate
```

---

## `clean`

Removes generated Swoff files and config:

```
swoff clean
```

This deletes:
- `swoff/` directory (all generated files)
- `swoff.config.json`

---

## `help [command]`

Shows help text for a specific command.

```
swoff help
swoff help init
swoff help generate
```

---

## Build script integration

The SW generator (`sw/generator.js`) must run after every build to produce the final
service worker file. Add it to your `package.json` build script:

```json
"build": "vite build && node swoff/sw/generator.js"
```

Or run it manually after each build:

```bash
node swoff/sw/generator.js
```

The generator:
1. Reads `swoff.config.json` for output dir, version, and strategy config
2. Reads `sw/template.js` — the service worker source code
3. Collects all built assets from the output directory
4. Replaces placeholders (`[[CACHE_NAME]]`, `[[ASSETS_LIST]]`, `[[AUTO_SKIP_WAITING]]`) with actual values
5. Writes the final versioned SW file (e.g. `dist/sw-v1.2.3.js`) and `version.json`
