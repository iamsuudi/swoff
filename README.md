# Swoff — Offline Infrastructure for Any Stack

Swoff is an open-source toolkit for offline-first, installable web apps — with **zero runtime dependencies**. It operates at the `fetch` event layer, generating auditable code you fully own rather than shipping a library you fight.

The repo houses **two** published tools plus the documentation site:

| Package                                   | What it does                                                          | Try it                                           |
| ----------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| [`@swoff/cli`](/apps/cli/README.md)       | Generate your service worker + offline client runtime from one config | `npx @swoff/cli init && npx @swoff/cli generate` |
| [`@swoff/assets`](/apps/assets/README.md) | Generate 50+ PWA assets from a single source or wordmark              | `npx @swoff/assets --source ./logo.svg`          |

- **Docs**: [swoff.space](https://swoff.space)
- **Assets builder**: [assets.swoff.space](https://assets.swoff.space)
- **Source**: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)

---

## Try @swoff/cli in 2 minutes

The CLI turns one `swoff.config.json` into an auditable service worker and client runtime — with 6 caching strategies, tag-based invalidation, an offline mutation queue, auth, GraphQL, server push, push notifications, and PWA install.

```bash
# 1. Init config (interactive, or --yes for defaults)
npx @swoff/cli init

# 2. Generate all files into swoff/
npx @swoff/cli generate

# 3. Add a build step (runs the generator after your build)
node swoff/sw/generator.mjs

# 4. Include in your HTML
#    Bundler:   import { initServiceWorker } from "./swoff/client-injector"; initServiceWorker();
#    No-bundler: <script src="/swoff/client-injector.bundle.js"></script>
```

Read the full [Getting Started guide](https://swoff.space/docs/getting-started) for per-ecosystem setup. The [CLI README](/apps/cli/README.md) covers every command and feature.

## Try @swoff/assets in 2 minutes

Generate icons, splash screens, Android adaptive icons, favicons, OG images, manifest.json, and HTML head tags — from a single source image, or a wordmark when you don't have one. No service worker, no build tool, no framework required.

```bash
npx @swoff/assets --source ./logo.svg
# or, from a text wordmark
npx @swoff/assets --app-name "My App"
```

Or use the visual builder at [assets.swoff.space](https://assets.swoff.space). See the [assets README](/apps/assets/README.md) for the full CLI reference and generated-file breakdown.

---

## Why Swoff

Most tools lock you into a framework (TanStack Query), only handle the service worker (Workbox), or force a dual-database architecture (RxDB). Swoff generates plain JavaScript at the `fetch` event layer — below the application and data-fetching layers — so it's smaller, simpler, and composable with anything: any frontend, any backend, any build tool.

## What @swoff/cli generates

- **6 caching strategies** — cache-first, network-first, stale-while-revalidate, cache-only, network-only, reactive (staleTime + refetchInterval)
- **Tag-based cache invalidation** — auto-tags from URL paths, glob matching, cascading, cross-tab sync
- **3 auth adapters** — cookie, bearer, custom, with token refresh and 401 detection
- **Offline mutation queue** — IndexedDB-backed, configurable retry with exponential backoff
- **GraphQL support** — body-hash caching, operation-name auto-tags
- **Service worker** — versioned, auditable, with navigation preload and auto-activation
- **SSE/WebSocket server push** — real-time cache invalidation from the SW
- **Push notifications** — subscription management + SW push handler
- **PWA install prompt** — configurable, plus storage estimation
- **Framework adapters** — generated hooks (`useSwoffFetch`, `useSwoffAuth`, `useSwoffPrecache`, etc.)

All configurable from a single `swoff.config.json`.

## What @swoff/assets generates

- **Icons** — PWA, Android adaptive, favicon, Apple touch
- **Splash screens** — Apple + Android
- **Images** — OG image, Microsoft tiles
- **Asset files** — manifest.json, HTML head tags, `pwa-debug.html` audit page

Up to 50 files from one source or wordmark.

## No package.json required

Swoff needs Node.js only for the toolchain — the output is plain JavaScript you serve as a static asset. Works with any backend (Laravel, Django, Rails, Go, PHP) and any frontend (React, Vue, Svelte, HTMX, vanilla).

## What Swoff is NOT

- **Not a runtime npm package** — the CLI generates code you own, zero KB in your bundle
- **Not a backend framework** — bring your own Go, Node.js, Python, PHP
- **Not tied to any fullstack framework** — purely client-side, framework-agnostic

## Repo Structure

```
swoff/
├── apps/
│   ├── cli/            # @swoff/cli — offline infrastructure generator
│   ├── assets/         # @swoff/assets — PWA asset generator
│   └── docs/           # Documentation site (Fumadocs + TanStack Start)
├── LICENSE
└── CHANGELOG.md
```

## Community

- **GitHub**: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff) — report bugs, request features, open issues
- **Documentation**: [swoff.space](https://swoff.space)
- **Assets**: [assets.swoff.space](https://assets.swoff.space)

## Development

This is a Turborepo monorepo. To run the docs site:

```bash
npm install
npm run dev
```

## License

MIT — see [LICENSE](/LICENSE).
