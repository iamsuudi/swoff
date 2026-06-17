import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/templates")({
  component: Templates,
});

function Templates() {
  return (
    <div className="min-h-screen flex flex-col bg-fd-background">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-20">
        <h1 className="text-3xl font-bold mb-6">Templates</h1>
        <p className="text-fd-muted-foreground mb-8">
          Starter templates and examples to bootstrap your Swoff project.
        </p>
        <div className="grid gap-6">
          <div className="border border-fd-border rounded-lg p-6">
            <h2 className="font-semibold text-lg mb-2">Minimal Starter</h2>
            <p className="text-sm text-fd-muted-foreground mb-4">
              Bare-bones Vite + Swoff setup with cache-first strategy.
            </p>
            <code className="text-xs bg-fd-muted px-3 py-1.5 rounded block">
              npx degit swoffjs/starters/minimal my-app
            </code>
          </div>
          <div className="border border-fd-border rounded-lg p-6">
            <h2 className="font-semibold text-lg mb-2">Offline-First Blog</h2>
            <p className="text-sm text-fd-muted-foreground mb-4">
              Blog with full offline support, tag-based invalidation, and push
              notifications.
            </p>
            <code className="text-xs bg-fd-muted px-3 py-1.5 rounded block">
              npx degit swoffjs/starters/offline-blog my-blog
            </code>
          </div>
          <div className="border border-fd-border rounded-lg p-6">
            <h2 className="font-semibold text-lg mb-2">Coming Soon</h2>
            <p className="text-sm text-fd-muted-foreground">
              More templates are being added — e-commerce dashboard, real-time
              chat, and PWA playground.
            </p>
          </div>
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
