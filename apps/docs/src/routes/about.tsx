import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="min-h-screen flex flex-col bg-fd-background">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-20">
        <h1 className="text-3xl font-bold mb-6">About Swoff</h1>
        <div className="text-fd-muted-foreground space-y-4 leading-relaxed">
          <p>
            Swoff is a config-driven code generation toolchain for building
            offline-first Progressive Web Apps. It generates an auditable
            service worker and client-side runtime from a single configuration
            file — no manual SW scripting, no runtime dependencies, no framework
            lock-in.
          </p>
          <p>
            Born from the frustration of wiring up Workbox, sw-precache, and
            hand-rolled service workers for every project, Swoff treats the
            service worker as generated infrastructure rather than application
            logic. You describe <em>what</em> to cache and how — Swoff writes
            the <em>how</em>.
          </p>
          <h2 className="text-xl font-semibold text-fd-foreground pt-4">
            Philosophy
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Config over code</strong> — Your caching rules, auth
              strategy, and offline queue live in a single config file, not
              scattered across SW event handlers.
            </li>
            <li>
              <strong>Auditable output</strong> — The generated service worker
              is human-readable and debuggable. No opaque bundles.
            </li>
            <li>
              <strong>Zero runtime deps</strong> — Swoff generates vanilla
              JS. No client-side library is injected into your bundle.
            </li>
            <li>
              <strong>Stack-agnostic</strong> — Works with React, Vue, Svelte,
              Solid, or no framework at all.
            </li>
          </ul>
        </div>
      </main>
      <footer className="border-t border-fd-border py-6 text-center text-sm text-fd-muted-foreground">
        <Link to="/" className="hover:text-fd-foreground transition-colors">
          Back to home
        </Link>
      </footer>
    </div>
  );
}
