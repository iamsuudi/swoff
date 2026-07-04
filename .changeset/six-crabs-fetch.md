---
"@swoff/cli": patch
---

- feat: Vue adapters — 14 composable templates (TS + JS) for Vue, Nuxt, Quasar, VitePress
- feat: Svelte adapters — 14 store templates (TS + JS) for Svelte and SvelteKit
- feat: rename all React adapters `use*` → `useSwoff*` to avoid naming conflicts
- feat: add Quasar, VitePress to auto-detected frameworks
- feat: adapter generator supports `.ts`/`.js` templates (no JSX required)
- feat: remove `status` from `usePrecacheProgress` — only `progress` remains
- feat: make storage threshold configurable via `features.serviceWorker.strategy.storageThreshold` (default 80%)
- feat: auto-strip X-SW-\* headers in SW fetch handler to prevent leaking to external servers
- fix: use op-name derived tags for GQL mutation invalidation instead of URL-based tags (cross-query entity updates still need explicit tags)
