# Swoff Documentation

This is the documentation site for Swoff, built with Fumadocs.

## About

Documentation for the Swoff offline-first blueprint — teaching developers how to build offline-capable web apps using pure browser APIs.

## Tech Stack

- [Fumadocs](https://fumadocs.dev/) — Documentation framework
- [TanStack Start](https://tanstack.com/start/latest) — Full-stack React framework (client-only mode)
- [Vite](https://vitejs.dev/) — Build tool

## Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the docs.

## Documentation Structure

```
content/docs/
├── index.mdx              # Introduction
├── introduction.mdx       # Getting started
├── features.mdx           # Feature overview
├── configuration/         # Config reference & migration
├── cli.mdx                # CLI reference
├── concepts/              # Theory and browser APIs
├── core/                  # Core architecture guides
├── patterns/              # Copy-paste code patterns
├── advanced/              # Advanced patterns (auth, sync, etc.)
├── integration/           # Framework-agnostic integration concepts
├── guides/                # Framework-specific setup
└── reference/             # Example apps
```
