import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
  ArrowRight,
  Globe,
  Code2,
  RefreshCw,
  Database,
  Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fd-border bg-fd-background/80 backdrop-blur-sm text-sm text-fd-muted-foreground mb-8">
          <Globe className="size-4" />
          <span>Zero dependencies. Copy-paste patterns. Own your code.</span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Build Offline-First
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Web Apps
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-fd-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          A blueprint for building web apps that feel like native apps.
          Versioned service workers, user-consented updates, full offline
          capability. No npm install — just copy our patterns and make them
          yours.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            to="/docs/"
            className={buttonVariants({ className: "text-base px-8 border" })}
          >
            Get Started
            <ArrowRight className="size-4 ml-2" />
          </Link>
          <a
            href="https://github.com/iamsuudi/swoff"
            target="_blank"
            className={buttonVariants({
              variant: "outline",
              className: "text-base px-8 border",
            })}
          >
            View on GitHub
          </a>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="flex flex-col items-center p-6 rounded-2xl border border-fd-border bg-fd-card/50 backdrop-blur-sm">
            <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Code2 className="size-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Zero Dependencies</h3>
            <p className="text-sm text-fd-muted-foreground">
              No npm packages. Copy our code directly into your project.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-2xl border border-fd-border bg-fd-card/50 backdrop-blur-sm">
            <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
              <RefreshCw className="size-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Versioned Updates</h3>
            <p className="text-sm text-fd-muted-foreground">
              User-consented SW updates. No silent breaks. Full control.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-2xl border border-fd-border bg-fd-card/50 backdrop-blur-sm">
            <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <Database className="size-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Works Offline</h3>
            <p className="text-sm text-fd-muted-foreground">
              Full offline capability. All routes, all data, all the time.
            </p>
          </div>
        </div>
      </div>

      {/* Concepts Section */}
      <div className="border-t border-fd-border">
        <div className="max-w-4xl mx-auto px-4 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Framework Agnostic</h2>
            <p className="text-fd-muted-foreground max-w-xl mx-auto">
              Works with React, Vue, Svelte, or vanilla JS. We provide patterns,
              you choose the framework.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-fd-border bg-fd-card/50">
              <Smartphone className="size-8 text-fd-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">PWA Ready</h3>
              <p className="text-sm text-fd-muted-foreground mb-4">
                Installable on all devices. Works like a native app, built with
                web standards.
              </p>
              <Link
                to="/docs/concepts/pwa-explained"
                className="text-sm text-fd-primary font-medium inline-flex items-center gap-1"
              >
                Learn about PWA →
              </Link>
            </div>

            <div className="p-6 rounded-2xl border border-fd-border bg-fd-card/50">
              <Globe className="size-8 text-fd-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Modern Browser APIs</h3>
              <p className="text-sm text-fd-muted-foreground mb-4">
                Service Worker, IndexedDB, Cache API. No frameworks needed.
              </p>
              <Link
                to="/docs/concepts/browser-apis"
                className="text-sm text-fd-primary font-medium inline-flex items-center gap-1"
              >
                Explore Browser APIs →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Implementation */}
      <div className="border-t border-fd-border bg-fd-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Reference Implementation</h2>
          <p className="text-fd-muted-foreground mb-8 max-w-xl mx-auto">
            Check out Budget Manager — a fully offline budget tracker built with
            Swoff patterns. 24+ routes, IndexedDB storage, versioned SW updates.
          </p>
          <Link
            to="/docs/reference/budget-manager"
            className={buttonVariants({
              variant: "outline",
              className: "text-base",
            })}
          >
            View Reference App
          </Link>
        </div>
      </div>
    </div>
  );
}
