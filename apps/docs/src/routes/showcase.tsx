import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/showcase")({
  component: Showcase,
});

function Showcase() {
  return (
    <div className="min-h-screen flex flex-col bg-fd-background">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-20">
        <h1 className="text-3xl font-bold mb-6">Showcase</h1>
        <p className="text-fd-muted-foreground mb-8">
          Projects and products built with Swoff. Coming soon — want to be
          listed? Open a PR on GitHub.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-fd-border rounded-lg p-6 text-center">
            <p className="text-fd-muted-foreground italic">Your project here</p>
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
