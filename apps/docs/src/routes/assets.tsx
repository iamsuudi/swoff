import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/assets")({
  component: AssetsPage,
});

export function AssetsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-fd-background text-fd-foreground">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-32">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fd-border bg-fd-muted px-3 py-1 text-xs font-semibold text-fd-muted-foreground">
            <Sparkles className="size-3" />
            PWA Asset Generator
          </span>
          <h1 className="text-4xl md:text-5xl font-black mt-6 mb-4">
            The interactive builder has its own home
          </h1>
          <p className="text-fd-muted-foreground text-lg mb-8 leading-relaxed">
            Generate icons, splash screens, Android adaptive icons, manifests,
            and more at{" "}
            <a
              href="https://assets.swoff.space"
              target="_blank"
              rel="noreferrer"
              className="text-fd-foreground font-semibold underline underline-offset-2 hover:text-fd-primary transition-colors"
            >
              assets.swoff.space
            </a>
            .
          </p>
          <a
            href="https://assets.swoff.space"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-6 text-[15px] shadow-lg transition-colors"
          >
            Open assets.swoff.space
            <ExternalLink className="size-4" />
          </a>
        </div>
      </main>
      <footer className="border-t border-fd-border py-6 text-center text-xs text-fd-muted-foreground">
        <p>
          Part of the{" "}
          <Link
            to="/"
            className="hover:text-fd-foreground transition-colors underline underline-offset-2"
          >
            Swoff
          </Link>{" "}
          project — offline infrastructure for any stack.
        </p>
      </footer>
    </div>
  );
}