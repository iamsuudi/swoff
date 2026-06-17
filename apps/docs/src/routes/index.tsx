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
  Container,
  Zap,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
});

const features = [
  {
    icon: Settings,
    title: "Config-Driven Code Gen",
    desc: "Define caching strategies, auth type, offline queue, and more in a single swoff.config.json. The CLI generates the full SW + client code.",
  },
  {
    icon: Layers,
    title: "6 Caching Strategies",
    desc: "Cache-first, network-first, stale-while-revalidate, cache-only, network-only, and reactive with staleTime + refetchInterval.",
  },
  {
    icon: Tags,
    title: "Tag-Based Invalidation",
    desc: "Auto-tags from URL paths. Glob matching, cascading dependencies, and cross-tab sync via SW broadcast — no query key management.",
  },
  {
    icon: Shield,
    title: "Auth Adapters",
    desc: "Cookie, bearer, and custom auth with token refresh before expiry, 401 detection, and cross-tab logout sync.",
  },
  {
    icon: RefreshCw,
    title: "Offline Mutation Queue",
    desc: "Queue writes in IndexedDB when offline, replay on reconnect. Configurable retry with exponential backoff and jitter.",
  },
  {
    icon: Globe,
    title: "Framework-Agnostic",
    desc: "Works with any frontend and any backend. No bundler, framework, or build-tool lock-in.",
  },
  {
    icon: Smartphone,
    title: "PWA + Push Notifications",
    desc: "Install prompt, storage estimation, push notification subscription management, and SW push event handler.",
  },
  {
    icon: Braces,
    title: "GraphQL Support",
    desc: "Body-hash caching by query + variables. Operation-name auto-tags. Offline mutation queue for GraphQL endpoints.",
  },
  {
    icon: Container,
    title: "Server Push & Cross-Tab Sync",
    desc: "SSE or WebSocket connections run in the SW — survive navigation and tab close. Push tags to invalidate cache across all tabs.",
  },
  {
    icon: Zap,
    title: "Zero Runtime Deps",
    desc: "Generated code uses only browser APIs — Service Worker, Cache Storage, IndexedDB. Zero KB added to your bundle.",
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-fd-foreground/[0.015] dark:bg-fd-foreground/[0.03] rounded-full blur-[100px]" />
    </div>
  );
}

function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-fd-background text-fd-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <SectionGlow className="opacity-70" />
        <div className="container mx-auto px-6 relative">
          <div className="flex flex-col items-center max-w-5xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-fd-foreground leading-[1.1]">
                Offline-Infra
                <br />
                <span className="text-fd-foreground">Zero Dependency</span>
              </h1>

              <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mt-6 mb-10 leading-relaxed mx-auto">
                An HTTP-based comprehensive offline infrastructure. Swoff
                generates an auditable service worker and client code from a
                single config file — no runtime deps, no bundler lock-in, works
                with any stack.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/docs/$"
                  params={{ _splat: "" }}
                  className={buttonVariants({
                    className:
                      "bg-fd-foreground text-fd-background hover:opacity-90 font-bold px-8 h-12 text-[15px] rounded-lg gap-2 shadow-lg",
                  })}
                >
                  Get Started
                  <ArrowRight className="size-4 text-blue-400" />
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
                  <GithubIcon className="size-4 text-fd-muted-foreground" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 border-t border-fd-border overflow-hidden">
        <SectionGlow />
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-xl mx-auto">
              Not just a service worker — a complete offline-first platform
              generated from config.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-fd-border bg-fd-card hover:border-fd-foreground/20 transition-all p-6 overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-fd-foreground/[0.02] dark:bg-fd-foreground/[0.04] rounded-full blur-[60px] pointer-events-none" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-fd-muted flex items-center justify-center mb-4">
                    <f.icon className="size-5 text-fd-muted-foreground" />
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
      <section className="relative py-20 border-t border-fd-border overflow-hidden">
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
      <section className="relative py-28 border-t border-fd-border overflow-hidden">
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
              to="/docs/$"
              params={{ _splat: "" }}
              className={buttonVariants({
                className:
                  "bg-fd-foreground text-fd-background hover:opacity-90 font-bold px-10 h-12 text-[15px] rounded-lg gap-2 shadow-lg",
              })}
            >
              Get Started for Free
              <ArrowRight className="size-4 text-blue-400" />
            </Link>
            <a
              href="https://github.com/iamsuudi/swoff"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "outline",
                className:
                  "border-fd-border text-fd-foreground hover:bg-fd-muted/50 font-bold px-10 h-12 text-[15px] rounded-lg gap-2",
              })}
            >
              <GithubIcon className="size-4 text-fd-muted-foreground" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-fd-border">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-fd-muted-foreground">
            MIT License &mdash; {new Date().getFullYear()} &mdash; Built by{" "}
            <a
              href="https://github.com/iamsuudi"
              target="_blank"
              rel="noreferrer"
              className="hover:text-fd-foreground transition-colors font-bold"
            >
              Suudi
            </a>
          </p>
          <div className="flex items-center gap-6 text-sm text-fd-muted-foreground">
            <a
              href="https://github.com/iamsuudi/swoff"
              target="_blank"
              rel="noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="/docs"
              className="hover:text-fd-foreground transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
