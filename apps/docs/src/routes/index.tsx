import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
  Bell,
  Image,
  Layers,
  PanelTopClose,
  Radio,
  RefreshCw,
  Rocket,
  Shield,
} from "lucide-react";
import { Icons } from "@/components/icons";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/")({
  component: Home,
});

const pillars = [
  {
    icon: Layers,
    title: "Caching",
    desc: "Six strategies with per-route pattern overrides, HTML cache isolation, request batching, and reactive stale-time refreshes.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: RefreshCw,
    title: "Offline Mutations",
    desc: "IndexedDB write queue with reconnect replay, exponential backoff, and batch processing.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Auth-Aware",
    desc: "Cookie, bearer, or custom auth with token refresh, 401 detection, SW bypass, and cross-tab clearAuth().",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Bell,
    title: "Push & PWA",
    desc: "Notifications from config, installability, and full PWA asset generation from a single SVG source.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Radio,
    title: "Real-Time & GraphQL",
    desc: "SSE/WebSocket server push in the SW scope, plus body-hash caching and op-name tag invalidation for GraphQL.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: PanelTopClose,
    title: "Cross-Tab Sync",
    desc: "Invalidation, auth, and mutation events broadcast to every tab through the SW message hub.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
];

const stackHighlights = {
  frontend: ["React", "Vue", "Svelte", "HTMX", "Solid"],
  meta: ["Next.js", "Nuxt", "SvelteKit", "TanStack Start", "Astro"],
  backend: ["Laravel", "Django", "Rails", "Go", "Node.js"],
};

function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-fd-background text-fd-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-24 md:pt-48 md:pb-32 overflow-hidden">
        <div className="container mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="flex items-center gap-2 px-4 py-1 rounded-full border border-fd-border bg-fd-card text-sm text-fd-muted-foreground mb-8">
                <Rocket className="size-3 text-fd-primary" />
                <span className="text-xs font-medium">
                  Offline Infrastructure Toolkit
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-fd-foreground leading-[1.05]">
                Offline Infrastructure
                <br />
                <span className="bg-linear-to-r from-fd-primary via-orange-400 to-amber-500 bg-clip-text text-transparent">
                  For Any Stack
                </span>
              </h1>

              <p className="text-md md:text-lg text-fd-muted-foreground mt-6 mb-10 leading-relaxed">
                A config-driven code generator for offline-first web apps. One{" "}
                <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">
                  swoff.config.json
                </code>{" "}
                drives caching, auth, offline queue, push, and PWA — with any
                frontend, backend, or build tool. The output is auditable
                vanilla JS you own, with zero runtime dependencies.
              </p>

              <div className="flex flex-wrap items-center lg:items-start gap-4">
                <Link
                  to="/docs/$"
                  params={{ _splat: "" }}
                  className={buttonVariants({
                    className:
                      "flex px-5 items-center justify-center bg-fd-foreground text-fd-background hover:opacity-90 font-bold h-12 text-[15px] rounded-lg gap-2 shadow-lg group",
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
                      "group flex px-5 items-center justify-center hover:text-white border-fd-border text-white hover:bg-fd-primary/95 bg-fd-primary font-bold h-12 text-[15px] rounded-lg gap-2 shadow",
                  })}
                >
                  <Icons.npm className="size-8 text-white group-hover:translate-x-0.5 transition-transform" />
                  package
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 w-full mx-auto text-left">
              <p className="text-xs font-medium text-fd-muted-foreground mb-3 lg:text-left">
                Try it in 2 minutes
              </p>
              <div className="rounded-xl bg-fd-card border border-fd-border overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-fd-border bg-fd-muted/40">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-yellow-500/70" />
                  <span className="size-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-xs text-fd-muted-foreground font-mono">
                    terminal
                  </span>
                </div>
                <pre className="px-5 py-4 overflow-x-auto text-[13px] leading-relaxed text-fd-foreground font-mono">
                  {`# 1. Init config (or --yes for defaults)
npx @swoff/cli init

# 2. Generate your swoff/ runtime
npx @swoff/cli generate

# 3. Build step — embed your assets
node swoff/sw/generator.mjs

# 4. Include the injector in your HTML
Bundler:
    import { initServiceWorker } from "./swoff/client-injector";
    initServiceWorker();
No-bundler:
    <script src="/swoff/client-injector.bundle.js"></script>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-fd-primary/2 dark:bg-fd-primary/4 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[200px] bg-amber-500/3 dark:bg-amber-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              Capabilities
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-xl mx-auto">
              Not just a service worker — a complete offline-first platform
              generated from a single config file.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((f) => (
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
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-sky-500/3 dark:bg-sky-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-6 relative">
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

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: "Frontend", items: stackHighlights.frontend },
              { label: "Meta-frameworks", items: stackHighlights.meta },
              { label: "Backend & Runtimes", items: stackHighlights.backend },
            ].map((group) => (
              <div
                key={group.label}
                className="rounded-xl border border-fd-border bg-fd-card p-6"
              >
                <h3 className="text-sm font-semibold text-fd-muted-foreground uppercase tracking-wider mb-4">
                  {group.label}
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {group.items.map((name) => (
                    <span
                      key={name}
                      className="px-3.5 py-1.5 rounded-lg border border-fd-border bg-fd-background text-sm font-medium text-fd-foreground"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <a
                  href="/docs/frameworks/ecosystem"
                  className="inline-block mt-4 text-sm text-fd-primary hover:underline"
                >
                  Full list →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assets callout */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-green-500/3 dark:bg-green-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-green-500/20 bg-green-500/5 text-sm text-green-600 dark:text-green-400 mb-6">
            <Image className="size-3" />
            <span className="text-xs font-medium">Standalone Package</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            <span className="bg-linear-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Need just PWA assets?
            </span>
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">
              @swoff/assets
            </code>{" "}
            generates 50+ production-ready PWA assets from a single source image
            — or a wordmark — including manifest and HTML head tags. No service
            worker, no build tool, no framework required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://assets.swoff.space"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                className:
                  "w-55 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-[15px] rounded-lg gap-2 shadow-lg group",
              })}
            >
              <Image className="size-4" />
              Explore the Builder
            </a>
            <code className="h-12 px-4 flex items-center justify-center rounded-lg bg-fd-muted border border-fd-border text-sm font-mono text-fd-foreground">
              npx @swoff/assets --source ./logo.svg
            </code>
          </div>
          <p className="text-sm text-fd-muted-foreground max-w-xl mx-auto mt-5">
            Then paste the generated{" "}
            <code className="text-xs bg-fd-muted px-1.5 py-0.5 rounded">
              swoff-head-tags.html
            </code>{" "}
            into your HTML{" "}
            <code className="text-xs bg-fd-muted px-1.5 py-0.5 rounded">
              &lt;head&gt;
            </code>{" "}
            (or meta-framework head API) — the manifest and icons only take
            effect once linked.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-28 overflow-hidden hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-fd-primary/5 dark:bg-fd-primary/8 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto px-6 text-center relative">
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
                  "w-55 flex items-center justify-center group hover:text-white border-fd-border text-white hover:bg-fd-primary/95 bg-fd-primary font-bold h-12 text-[15px] rounded-lg gap-2 shadow",
              })}
            >
              <Icons.npm className="size-8 text-white group-hover:translate-x-0.5 transition-transform" />
              package
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-fd-muted-foreground">
                &copy; {new Date().getFullYear()} Swoff
              </span>
            </div>
            <div className="flex items-center gap-5 text-xs text-fd-muted-foreground">
              <a
                href="https://assets.swoff.space"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fd-foreground transition-colors"
              >
                Assets
              </a>
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
