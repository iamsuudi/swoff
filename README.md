# Swoff (Service Worker & Offline)

Offline-first and versioned web app blueprint that works like native apps using pure web APIs.

## Philosophy

**We provide code, not dependencies.**

Swoff is not a framework you install via npm. It's a collection of patterns, code snippets, and architecture guides that you copy into your project and fully own.

- **Learn the concepts** — Understand offline-first architecture
- **Copy our patterns** — Take service worker, hooks, and utilities into your project
- **Own your code** — Modify, extend, and maintain it yourself

## What Swoff Provides

- **Versioned service worker** — User-consented updates, no silent SW changes
- **Offline-first architecture** — App skeleton and routes work 100% offline
- **Framework agnostic** — Works with React, Vue, Svelte, or vanilla JS
- **Zero runtime dependencies** — Pure browser APIs: Service Worker, IndexedDB, Cache API
- **PWA-ready** — Installable with manifest and install prompts

## Project Structure

```
swoff/
├── apps/docs/          # Documentation site (Fumadocs)
├── packages/
│   ├── eslint-config/  # Shared ESLint config
│   └── typescript-config/ # Shared TypeScript config
```

## Quick Start

No install needed! Just read the docs and copy the code:

1. Start with [Concepts](https://swoff.dev/docs/concepts/what-is-offline-and-sw) — understand offline capability
2. Follow the [Core Architecture](https://swoff.dev/docs/core/offline-architecture) guides
3. Copy [Framework-Agnostic Patterns](https://swoff.dev/docs/patterns/sw-template)
4. Choose your framework: [Framework Guides](https://swoff.dev/docs/guides)

## Key Features

- **Guaranteed offline capability** — Versioned SW with asset caching
- **Consent-based updates** — Users control when to update
- **Client-only runtime** — All logic runs in browser, no backend required
- **Installable** — PWA-ready with manifest and install prompts

## Reference Implementation

Check out **Budget Manager** — a fully offline budget tracking app built with Swoff patterns:

- 24+ routes working offline
- IndexedDB for data storage
- Versioned SW updates
- [GitHub →](https://github.com/iamsuudi/budget-manager)

## Future Roadmap

- **Auth integration** — Bearer/cookie/auth header patterns with token refresh
- **Push notifications** — Client-side subscription handling
- **Build-time CLI** — Code generation from config (in progress)

## What Swoff is NOT

- ❌ A backend framework (users bring their own Go, Node.js, Python, etc.)
- ❌ An npm package you install
- ❌ A replacement for your framework's backend features
- ❌ Tied to any specific fullstack framework

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

MIT — Use freely in your projects.
