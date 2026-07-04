---
"@swoff/cli": patch
---

- fix: strip redirected flag from cached responses returned by fallback() to prevent browser rejecting event.respondWith() with a NetworkError
- feat: add precacheDirs defaults for vue, svelte, sveltekit init presets
- feat: rename `react-spa` → `react` framework name (backward-compat alias kept for existing configs)
- feat: add vike framework detection and init preset (SSR, dist/client output, Vue adapters)
