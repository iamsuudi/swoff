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
  Radio,
  Bell,
  Timer,
  Image,
  Images,
  PanelTopClose,
  Terminal,
  Rocket,
} from "lucide-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Icons } from "@/components/icons";
import {
  frontendFrameworks,
  metaFrameworks,
  backendFrameworks,
} from "@/lib/frameworks";

export const Route = createFileRoute("/")({
  component: Home,
});

const features = [
  {
    icon: Settings,
    title: "Config-Driven",
    desc: "Define strategies, auth, offline queue, push, and PWA in a single swoff.config.json. The CLI generates the full SW + client runtime from it.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Layers,
    title: "6 Caching Strategies",
    desc: "Cache-first, network-first, stale-while-revalidate, cache-only, network-only, and reactive. Per-route pattern overrides with 3-tier resolution.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Timer,
    title: "Reactive Strategy",
    desc: "StaleTime + refetchInterval for automatic background refreshes. Refetch on reconnect, refetch on focus — data stays fresh without manual invalidation.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: Globe,
    title: "HTML Cache Isolation",
    desc: "HTML stored in a separate cache from JSON/API payloads. Prevents Content-Type corruption on hard refresh — no framework-specific hacks needed.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Tags,
    title: "Tag-Based Invalidation",
    desc: "Auto-tags from URL paths with glob matching, cascading dependencies, and cross-tab sync via SW message hub. No query-key management.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: PanelTopClose,
    title: "Cross-Tab Sync",
    desc: "Invalidation, auth state, and mutation events broadcast to all open tabs through the SW — no BroadcastChannel or manual coordination needed.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Request Batching",
    desc: "50ms coalescing window merges concurrent identical GET requests into a single fetch. In-flight dedup via promise cloning. Configurable and auto-discoverable.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: RefreshCw,
    title: "Offline Mutation Queue",
    desc: "Queue writes in IndexedDB when offline, replay on reconnect. Configurable retry with exponential backoff, jitter, and batch processing.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Auth-Aware Caching",
    desc: "Cookie, bearer, and custom auth with token refresh and 401 detection. Auth routes bypass the SW automatically. clearAuth() cascades across all tabs.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Radio,
    title: "Server Push (SSE / WebSocket)",
    desc: "Real-time cache invalidation via SSE or WebSocket. Connections live in the SW scope — survive navigation, tab close, and page refresh.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Bell,
    title: "Push Notifications",
    desc: "Built-in subscription management, VAPID key configuration, and SW push handler. Generated from config — no manual SW wiring for push events.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Smartphone,
    title: "PWA Installability",
    desc: "Install prompt management with configurable suppression. Storage estimation, manifest generation, and service worker lifecycle handled by generated code.",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
  },
  {
    icon: Images,
    title: "PWA Asset Generation",
    desc: "Generate icons, splash screens, favicons, Apple touch icons, and OG images from a single SVG source. Includes HTML meta-tag guide for your <head>.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Braces,
    title: "GraphQL Support",
    desc: "Body-hash caching by query + variables, operation-name auto-tags, offline mutation queue, and multi-endpoint support.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Globe,
    title: "Framework-Agnostic",
    desc: "Works with any frontend (React, Vue, Svelte, HTMX) and any backend (Laravel, Django, Rails, Go). No bundler or build-tool lock-in — output is plain JS.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-fd-background text-fd-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden">
        <div className="container mx-auto px-6 relative">
          <div className="flex flex-col items-center max-w-5xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-1 rounded-full border border-fd-border bg-fd-card text-sm text-fd-muted-foreground mb-8">
              <Rocket className="size-3 text-fd-primary" />
              <span className="text-xs font-medium">
                Offline Infrastructure Toolkit
              </span>
            </div>

            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-fd-foreground leading-[1.05]">
                Offline Web Infra
                <br />
                <span className="bg-linear-to-r from-fd-primary via-orange-400 to-amber-500 bg-clip-text text-transparent text-center">
                  For Any Stack
                </span>
              </h1>

              <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mt-6 mb-10 leading-relaxed mx-auto">
                Swoff is a config-driven code generation toolchain for
                offline-first web apps. An interactive wizard builds your
                config, the CLI generates an auditable service worker and client
                runtime, and you own every line — zero runtime dependencies, no
                framework coupling.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/docs/$"
                  params={{ _splat: "" }}
                  className={buttonVariants({
                    className:
                      "w-55 flex items-center justify-center bg-fd-foreground text-fd-background hover:opacity-90 font-bold h-12 text-[15px] rounded-lg gap-2 shadow-lg group",
                  })}
                >
                  Get Started
                  <Rocket className="size-4 text-fd-primary group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="https://www.npmjs.com/package/@swoff/cli"
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "w-55 flex items-center justify-center border-fd-border text-fd-foreground hover:bg-fd-primary/95 bg-fd-primary font-bold h-12 text-[15px] rounded-lg gap-2 shadow",
                  })}
                >
                  <Icons.npm className="size-8 text-fd-foreground" />
                  package
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-fd-primary/3 dark:bg-fd-primary/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              <span className="text-fd-foreground">How It Works</span>
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-xl mx-auto">
              One interactive session, one CLI command, one build step — and you
              own the output.
            </p>
          </div>

          <div className="relative grid md:grid-cols-4 gap-6">
            {[
              {
                icon: Terminal,
                title: "1. Init",
                code: "swoff init",
                desc: "interactive wizard builds your config",
              },
              {
                icon: Settings,
                title: "2. Generate",
                code: "swoff generate",
                desc: "CLI produces auditable TS/JS source files",
              },
              {
                icon: Zap,
                title: "3. Build",
                code: "node swoff/sw/generator.mjs",
                desc: "inlines built assets into the final SW",
              },
              {
                icon: Rocket,
                title: "4. Deploy",
                code: null,
                desc: "Serve as static assets — no runtime library, no backend coupling",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="group relative rounded-xl border border-fd-border bg-fd-card hover:border-fd-foreground/20 transition-all p-6 text-center overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-fd-foreground/2 dark:bg-fd-foreground/4 rounded-full blur-[60px] pointer-events-none" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-fd-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                    <step.icon className="size-7 text-fd-primary" />
                  </div>
                  <h3 className="font-bold text-fd-foreground mb-2 text-lg">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-fd-muted-foreground leading-relaxed">
                    {step.code ? (
                      <>
                        Run{" "}
                        <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                          {step.code}
                        </code>
                        <br />
                      </>
                    ) : null}
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 overflow-hidden border-t border-fd-border">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-fd-primary/2 dark:bg-fd-primary/4 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[200px] bg-amber-500/3 dark:bg-amber-500/5 rounded-full blur-[100px]" />
        </div>
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

      {/* Assets callout */}
      <section className="relative py-20 overflow-hidden border-t border-fd-border">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-green-500/3 dark:bg-green-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-green-500/20 bg-green-500/5 text-sm text-green-600 dark:text-green-400 mb-6">
            <Image className="size-3" />
            <span className="text-xs font-medium">Standalone Package</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            <span className="bg-linear-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Need just PWA icons?
            </span>
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">
              @swoff/assets
            </code>{" "}
            generates 31+ production-ready PWA assets from a single SVG — icons,
            splash screens, favicons, Apple touch icons, OG images, Microsoft
            tiles, manifest.json, and HTML head tags. No service worker, no
            build tool, no framework required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/assets"
              className={buttonVariants({
                className:
                  "w-55 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-[15px] rounded-lg gap-2 shadow-lg group",
              })}
            >
              <Image className="size-4" />
              Learn More
            </Link>
            <code className="h-12 px-4 flex items-center justify-center rounded-lg bg-fd-muted border border-fd-border text-sm font-mono text-fd-foreground">
              npx @swoff/assets --source ./logo.svg
            </code>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative py-20 overflow-hidden border-t border-fd-border">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-sky-500/3 dark:bg-sky-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              <span className="text-fd-foreground">Works with Everything</span>
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
      <section className="relative py-28 overflow-hidden border-t border-fd-border">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-fd-primary/5 dark:bg-fd-primary/8 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 text-center relative">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-linear-to-r from-fd-primary via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Ready to ship?
            </span>
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto mb-10">
            No runtime deps, no framework lock-in, no package.json required.
            Just an interactive session and a CLI command — you own the code.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/docs/$"
              params={{ _splat: "" }}
              className={buttonVariants({
                className:
                  "w-55 flex items-center justify-center bg-fd-foreground text-fd-background hover:opacity-90 font-bold h-12 text-[15px] rounded-lg gap-2 shadow-lg group",
              })}
            >
              Get Started
              <Rocket className="size-4 text-fd-primary group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="https://www.npmjs.com/package/@swoff/cli"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "outline",
                className:
                  "w-55 flex items-center justify-center border-fd-border text-fd-foreground hover:bg-fd-primary/95 bg-fd-primary font-bold h-12 text-[15px] rounded-lg gap-2 shadow",
              })}
            >
              <Icons.npm className="size-8 text-fd-foreground" />
              package
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-fd-border py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-fd-muted-foreground">
                &copy; {new Date().getFullYear()} Swoff
              </span>
            </div>
            <div className="flex items-center gap-5 text-xs text-fd-muted-foreground">
              <Link
                to="/assets"
                className="hover:text-fd-foreground transition-colors"
              >
                Assets
              </Link>
              <Link
                to="/docs/$"
                params={{ _splat: "" }}
                className="hover:text-fd-foreground transition-colors"
              >
                Docs
              </Link>
              <Link
                to="/about"
                className="hover:text-fd-foreground transition-colors"
              >
                About
              </Link>
              <a
                href="https://github.com/iamsuudi/swoff"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fd-foreground transition-colors flex items-center gap-1"
              >
                <Icons.gitHub className="size-3" />
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/@swoff/cli"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fd-foreground transition-colors flex items-center gap-1"
              >
                <Icons.npm className="size-7" />
              </a>
            </div>
          </div>
          <p className="text-[11px] text-fd-muted-foreground/60 text-center mt-4 md:mt-3">
            Offline infrastructure for any stack — generated, not configured.
          </p>
        </div>
      </footer>
    </div>
  );
}
