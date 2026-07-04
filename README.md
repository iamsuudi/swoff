# Swoff — Offline Infrastructure

A config-driven code generation toolchain for offline-first, installable PWAs. Swoff generates an auditable service worker and client code from a single config file — zero runtime dependencies.

```bash
npx @swoff/cli init && npx @swoff/cli generate
```

## Why Swoff

Most tools either lock you into a framework (TanStack Query), only handle the SW (Workbox), or force a dual-database architecture (RxDB). Swoff operates at the `fetch` event layer — below the application and data-fetching layers — making it smaller, simpler, and composable with anything.

## What it generates

- **6 caching strategies** — cache-first, network-first, stale-while-revalidate, cache-only, network-only, reactive (with staleTime + refetchInterval)
- **Tag-based cache invalidation** — auto-tags from URL paths, glob matching, cascading, cross-tab sync
- **3 auth adapters** — cookie, bearer, custom with token refresh and 401 detection
- **Offline mutation queue** — IndexedDB-backed, configurable retry with exponential backoff
- **GraphQL support** — body-hash caching, operation-name auto-tags
- **Service worker** — versioned, auditable, with navigation preload and auto-activation
- **SSE/WebSocket server push** — real-time cache invalidation from the SW
- **Push notifications** — subscription management + SW push handler
- **PWA install prompt** — configurable, plus storage estimation
- **Framework adapters** — 14 generated hooks (`useSwoffFetch`, `useSwoffAuth`, `useSwoffPrecache`, etc.)

All configurable from a single `swoff.config.json`.

## No package.json required

Swoff needs Node.js only for the toolchain — the output is plain JavaScript you serve as a static asset. Works with any backend (Laravel, Django, Rails, Go, PHP) and any frontend (React, Vue, Svelte, HTMX, vanilla).

## Quick Start

```bash
# 1. Init config (interactive or --yes for defaults)
npx @swoff/cli init

# 2. Generate all files
npx @swoff/cli generate

# 3. Build the service worker (after your build)
node swoff/sw/generator.mjs

# 4. Include in your HTML
<script src="/swoff/client-injector.js"></script>
```

See the [documentation](https://swoff.dev/docs) for per-ecosystem guides.

## Project Structure

```
swoff/
├── apps/
│   ├── cli/            # @swoff/cli — the code generation tool
│   ├── assets/         # @swoff/assets — PWA icon generator
│   └── docs/           # Documentation site (Fumadocs + TanStack Start)
```

## What Swoff is NOT

- **Not a runtime npm package** — the CLI generates code you own, zero KB in your bundle
- **Not a backend framework** — bring your own Go, Node.js, Python, PHP
- **Not tied to any fullstack framework** — purely client-side, framework-agnostic

## Community

- **GitHub**: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)
- **Documentation**: [swoff.dev/docs](https://swoff.dev/docs)
- **Issues**: Report bugs or request features on GitHub

## Development

This is a Turborepo monorepo. To run the docs site:

```bash
npm install
npm run dev
```

## License

MIT
