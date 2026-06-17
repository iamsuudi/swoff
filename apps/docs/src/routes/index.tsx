import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import {
  Settings,
  Layers,
  Tags,
  Shield,
  RefreshCw,
  Globe,
  Smartphone,
  Braces,
  Zap,
  Database,
  Radio,
  ArrowRight,
  Bell,
  Command,
  Blocks,
  Cpu,
  ExternalLink,
  PanelTopClose,
  CircleDot,
} from "lucide-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Icons } from "@/components/icons";

export const Route = createFileRoute("/")({
  component: Home,
});

const features = [
  {
    icon: Settings,
    title: "Config-Driven Code Gen",
    desc: "Define caching strategies, auth type, offline queue, and more in a single swoff.config.json. The CLI generates the full SW + client code.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Layers,
    title: "6 Caching Strategies",
    desc: "Cache-first, network-first, stale-while-revalidate, cache-only, network-only, and reactive with staleTime + refetchInterval.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Tags,
    title: "Tag-Based Invalidation",
    desc: "Auto-tags from URL paths. Glob matching, cascading dependencies, and cross-tab sync via SW broadcast — no query key management.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Shield,
    title: "Auth Adapters",
    desc: "Cookie, bearer, and custom auth with token refresh, 401 detection, memory-only tokens, and cross-tab logout sync via clearAuth().",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: RefreshCw,
    title: "Offline Mutation Queue",
    desc: "Queue writes in IndexedDB when offline, replay on reconnect. Configurable retry with exponential backoff, jitter, and batch processing.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Globe,
    title: "Framework-Agnostic",
    desc: "Works with any frontend (React, Vue, Svelte, HTMX) and any backend (Laravel, Django, Rails, Go). No bundler or build-tool lock-in.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Smartphone,
    title: "PWA Installability",
    desc: "Install prompt management, icon generation, storage estimation, and manifest generation — all generated from config.",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
  },
  {
    icon: Bell,
    title: "Push Notifications",
    desc: "Built-in push notification subscription management, VAPID key configuration, and SW push event handler — no manual service worker wiring.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Braces,
    title: "GraphQL Support",
    desc: "Body-hash caching by query + variables, operation-name auto-tags, offline mutation queue, and multi-endpoint support.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Database,
    title: "HTML Cache Isolation",
    desc: "HTML responses stored in a separate cache container from JSON/RSC payloads — prevents Content-Type corruption on hard refresh without framework-specific logic.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Radio,
    title: "Server Push (SSE / WebSocket)",
    desc: "Real-time cache invalidation via SSE or WebSocket. Connections run in the SW scope — survive navigation, tab close, and page refresh.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: PanelTopClose,
    title: "Cross-Tab Sync",
    desc: "Cache invalidation, auth state changes, and mutation queue events broadcast to all open tabs via SW message hub — no BroadcastChannel needed.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Command,
    title: "Request Batching",
    desc: "50ms coalescing window merges concurrent identical GET requests into a single fetch. In-flight dedup via promise cloning. Configurable and auto-discoverable.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: Zap,
    title: "Zero Runtime Deps",
    desc: "Generated code uses only browser APIs — Service Worker, Cache Storage, IndexedDB. Zero KB added to your bundle. You own every line.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
];

const frontendFrameworks = [
  "React",
  "Vue",
  "Svelte",
  "Solid",
  "Preact",
  "Angular",
  "Alpine",
  "HTMX",
  "Lit",
  "Qwik",
  "Marko",
  "Stimulus",
  "jQuery",
];

const metaFrameworks = [
  "Next.js",
  "Remix",
  "Nuxt",
  "SvelteKit",
  "TanStack Start",
  "Astro",
  "Gatsby",
  "Eleventy",
  "Hugo",
  "Jekyll",
];

const backendFrameworks = [
  "Laravel",
  "Django",
  "Rails",
  "Express",
  "Fastify",
  "Hono",
  "Go",
  "PHP",
  "Python",
  "Ruby",
  "Java",
  "Spring",
  "ASP.NET",
  "Rust",
  "Phoenix",
  "Deno",
  "Bun",
  "Node.js",
];

function SectionGlow({ className }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-fd-foreground/1.5 dark:bg-fd-foreground/3 rounded-full blur-[100px]" />
    </div>
  );
}

function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-fd-background text-fd-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden">
        <SectionGlow className="opacity-70" />
        <div className="container mx-auto px-6 relative">
          <div className="flex flex-col items-center max-w-5xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-1 rounded-full border border-fd-border bg-fd-card text-sm text-fd-muted-foreground mb-8">
              <Blocks className="size-3 text-fd-primary" />
              <span className="text-xs">MIT License — Open Source</span>
            </div>

            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-fd-foreground leading-[1.05] text-center">
                Offline Infrastructure,
                <br />
                <span className="bg-linear-to-r from-fd-primary via-orange-400 to-amber-500 bg-clip-text text-transparent text-center">
                  Zero Dependencies
                </span>
              </h1>

              <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mt-6 mb-10 leading-relaxed mx-auto">
                Swoff generates an auditable Service Worker and client code that
                uses only native browser APIs — no runtime deps, no plugins, no
                bundler hooking, no framework coupling. Just a CLI command and
                you own the output.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/docs/$"
                  params={{ _splat: "" }}
                  className={buttonVariants({
                    className:
                      "bg-fd-foreground text-fd-background hover:opacity-90 font-bold px-8 h-12 text-[15px] rounded-lg gap-2 shadow-lg group",
                  })}
                >
                  Get Started
                  <ArrowRight className="size-4 text-fd-primary group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="https://github.com/iamsuudi/swoff"
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "border-fd-border text-fd-foreground hover:bg-fd-muted/50 font-bold px-8 h-12 text-[15px] rounded-lg gap-2",
                  })}
                >
                  <Icons.gitHub className="size-4 text-fd-muted-foreground" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-20 overflow-hidden">
        <SectionGlow />
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              How It Works
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-xl mx-auto">
              One config, one CLI command, and you own the generated output.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-fd-primary/10 flex items-center justify-center mx-auto mb-5">
                <Settings className="size-7 text-fd-primary" />
              </div>
              <h3 className="font-bold text-fd-foreground mb-2 text-lg">
                1. Configure
              </h3>
              <p className="text-[14px] text-fd-muted-foreground leading-relaxed">
                Define strategies, auth, queue, and PWA in a single
                <br />
                <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                  swoff.config.json
                </code>
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-fd-primary/10 flex items-center justify-center mx-auto mb-5">
                <Command className="size-7 text-fd-primary" />
              </div>
              <h3 className="font-bold text-fd-foreground mb-2 text-lg">
                2. Generate
              </h3>
              <p className="text-[14px] text-fd-muted-foreground leading-relaxed">
                Run{" "}
                <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                  npx @swoff/cli generate
                </code>
                <br />— CLI produces auditable TS/JS source files
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-fd-primary/10 flex items-center justify-center mx-auto mb-5">
                <Cpu className="size-7 text-fd-primary" />
              </div>
              <h3 className="font-bold text-fd-foreground mb-2 text-lg">
                3. Deploy
              </h3>
              <p className="text-[14px] text-fd-muted-foreground leading-relaxed">
                Serve as static assets — no runtime library,
                <br />
                no framework dependency, no backend coupling
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 overflow-hidden">
        <SectionGlow />
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-xl mx-auto">
              Not just a Service Worker — a complete offline-first platform
              generated from a single config file.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-fd-border bg-fd-card hover:border-fd-foreground/20 transition-all p-6 overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-fd-foreground/2 dark:bg-fd-foreground/4 rounded-full blur-[60px] pointer-events-none" />
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}
                  >
                    <f.icon className={`size-5 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-fd-foreground mb-2 text-[15px]">
                    {f.title}
                  </h3>
                  <p className="text-[14px] text-fd-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative py-20 overflow-hidden">
        <SectionGlow className="opacity-50" />
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              Works with Everything
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-2xl mx-auto">
              Swoff operates at the{" "}
              <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">
                fetch
              </code>{" "}
              event layer — below frameworks and bundlers. Compatible with any
              frontend, any backend, any build tool.
            </p>
          </div>

          <div className="space-y-10">
            <div>
              <h3 className="text-sm font-semibold text-fd-muted-foreground uppercase tracking-wider mb-4 text-center">
                Frontend Frameworks
              </h3>
              <div className="flex flex-wrap justify-center gap-2.5">
                {frontendFrameworks.map((name) => (
                  <span
                    key={name}
                    className="px-3.5 py-1.5 rounded-lg border border-fd-border bg-fd-card text-sm font-medium text-fd-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fd-muted-foreground uppercase tracking-wider mb-4 text-center">
                Meta-Frameworks & SSG
              </h3>
              <div className="flex flex-wrap justify-center gap-2.5">
                {metaFrameworks.map((name) => (
                  <span
                    key={name}
                    className="px-3.5 py-1.5 rounded-lg border border-fd-border bg-fd-card text-sm font-medium text-fd-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fd-muted-foreground uppercase tracking-wider mb-4 text-center">
                Backend & Server Runtimes
              </h3>
              <div className="flex flex-wrap justify-center gap-2.5">
                {backendFrameworks.map((name) => (
                  <span
                    key={name}
                    className="px-3.5 py-1.5 rounded-lg border border-fd-border bg-fd-card text-sm font-medium text-fd-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-28 overflow-hidden">
        <SectionGlow />
        <div className="max-w-5xl mx-auto px-6 text-center relative">
          <h2 className="text-4xl md:text-5xl font-black text-fd-foreground mb-6">
            Ready to ship?
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto mb-10">
            No runtime deps, no framework lock-in, no package.json required.
            Just a single config and a CLI command.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/docs"
              params={{ _splat: "" }}
              className={buttonVariants({
                className:
                  "bg-fd-foreground text-fd-background hover:opacity-90 font-bold px-10 h-12 text-[15px] rounded-lg gap-2 shadow-lg group",
              })}
            >
              Get Started
              <ArrowRight className="size-4 text-fd-primary group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="https://github.com/iamsuudi/swoff"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "outline",
                className:
                  "border-fd-border text-fd-foreground hover:bg-fd-muted/50 font-bold px-10 h-12 text-[15px] rounded-lg gap-2 shadow-md",
              })}
            >
              <Icons.gitHub className="size-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-fd-border bg-fd-card/50">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold text-fd-foreground text-sm mb-4">
                Product
              </h4>
              <ul className="space-y-2.5 text-sm text-fd-muted-foreground">
                <li>
                  <Link
                    to="/docs/$"
                    params={{ _splat: "" }}
                    className="hover:text-fd-foreground transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/docs/comparisons"
                    className="hover:text-fd-foreground transition-colors"
                  >
                    Comparisons
                  </Link>
                </li>
                <li>
                  <Link
                    to="/docs/architecture"
                    className="hover:text-fd-foreground transition-colors"
                  >
                    Architecture
                  </Link>
                </li>
                <li>
                  <Link
                    to="/docs/config"
                    className="hover:text-fd-foreground transition-colors"
                  >
                    Configuration
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-fd-foreground text-sm mb-4">
                Resources
              </h4>
              <ul className="space-y-2.5 text-sm text-fd-muted-foreground">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-fd-foreground transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    to="/showcase"
                    className="hover:text-fd-foreground transition-colors"
                  >
                    Showcase
                  </Link>
                </li>
                <li>
                  <Link
                    to="/templates"
                    className="hover:text-fd-foreground transition-colors"
                  >
                    Templates
                  </Link>
                </li>
                <li>
                  <Link
                    to="/docs/guides"
                    className="hover:text-fd-foreground transition-colors"
                  >
                    Guides
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-fd-foreground text-sm mb-4">
                Community
              </h4>
              <ul className="space-y-2.5 text-sm text-fd-muted-foreground">
                <li>
                  <a
                    href="https://github.com/iamsuudi/swoff"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-fd-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    <Icons.gitHub className="size-3.5" />
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/iamsuudi/swoff/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-fd-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    <CircleDot className="size-3.5" />
                    Issues
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/iamsuudi"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-fd-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    <Icons.XIcon className="size-3.5" />
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/iamsuudi/swoff/discussions"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-fd-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    Discussions
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-fd-foreground text-sm mb-4">
                Legal
              </h4>
              <ul className="space-y-2.5 text-sm text-fd-muted-foreground">
                <li className="text-fd-muted-foreground">MIT License</li>
                <li className="text-fd-muted-foreground">
                  &copy; {new Date().getFullYear()} Suudi
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-fd-border py-6">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-fd-muted-foreground">
              Built by{" "}
              <a
                href="https://github.com/iamsuudi"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fd-foreground transition-colors font-bold"
              >
                Abdulfetah Suudi
              </a>
            </p>
            <p className="text-sm text-fd-muted-foreground">
              Offline Infrastructure
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
