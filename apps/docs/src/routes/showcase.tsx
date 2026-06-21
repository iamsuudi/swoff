import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import projects from "../../content/showcase/projects.json";

export const Route = createFileRoute("/showcase")({
  component: Showcase,
});

function Showcase() {
  return (
    <div className="min-h-screen flex flex-col bg-fd-background">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-20">
        <h1 className="text-3xl font-bold mb-6">Showcase</h1>
        <p className="text-fd-muted-foreground mb-8">
          Projects and products built with Swoff. Have one to share?{" "}
          <a
            href="https://github.com/iamsuudi/swoff"
            target="_blank"
            rel="noreferrer"
            className="text-fd-primary hover:underline"
          >
            Open a PR
          </a>
          .
        </p>

        {projects.length === 0 ? (
          <div className="border border-dashed border-fd-border rounded-lg p-12 text-center">
            <p className="text-fd-muted-foreground italic mb-2">No projects yet</p>
            <p className="text-sm text-fd-muted-foreground/70">
              Be the first to add yours — edit{" "}
              <code className="bg-fd-muted px-1 py-0.5 rounded text-xs">
                content/showcase/projects.json
              </code>
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <div
                key={project.id}
                className="border border-fd-border rounded-lg overflow-hidden bg-fd-card hover:border-fd-primary/30 transition-colors"
              >
                {project.screenshot ? (
                  <img
                    src={project.screenshot}
                    alt={project.name}
                    className="w-full h-40 object-cover border-b border-fd-border"
                  />
                ) : (
                  <div className="w-full h-40 bg-fd-muted/50 border-b border-fd-border flex items-center justify-center">
                    <span className="text-fd-muted-foreground text-sm">No preview</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-fd-foreground mb-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-fd-muted-foreground mb-3">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded bg-fd-primary/10 text-fd-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3 text-sm">
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-fd-primary hover:underline"
                      >
                        Live Demo
                      </a>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noreferrer"
                        className="text-fd-muted-foreground hover:text-fd-foreground"
                      >
                        Source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <footer className="border-t border-fd-border py-6 text-center text-sm text-fd-muted-foreground">
        <Link to="/" className="hover:text-fd-foreground transition-colors">
          Back to home
        </Link>
      </footer>
    </div>
  );
}