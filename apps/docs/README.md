# Swoff Documentation

Documentation site for [Swoff](https://github.com/iamsuudi/swoff) — a config-driven code generation toolchain for offline-first PWAs.

## Tech Stack

- [Fumadocs](https://fumadocs.dev/) — Documentation framework
- [TanStack Start](https://tanstack.com/start/latest) — Full-stack React framework (static export)
- [Vite](https://vitejs.dev/) — Build tool

## Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Documentation Structure

```
content/docs/
├── index.mdx              # Motivation & positioning
├── introduction.mdx       # Getting started in 2 commands
├── meta.json              # Sidebar order
├── architecture/          # Design rationale docs
├── cli/                   # CLI commands & config schema
├── comparisons/           # Swoff vs alternatives
├── frameworks/            # Per-ecosystem integration
├── guides/                # Feature guides
└── api/                   # Generated file reference
```
