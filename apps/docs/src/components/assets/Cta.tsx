import { Link } from "@tanstack/react-router";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Icons } from "@/components/icons";

export function Cta() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-green-500/5 dark:bg-green-500/8 rounded-full blur-[100px]" />
      </div>
      <div className="max-w-5xl mx-auto px-6 text-center relative">
        <h2 className="text-4xl md:text-5xl font-black text-fd-foreground mb-6">
          Ready to generate?
        </h2>
        <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto mb-10">
          One command. One source file (or none). 50+ production-ready assets.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <code className="px-5 py-3 rounded-lg bg-fd-muted border border-fd-border text-sm font-mono text-fd-foreground">
            npx @swoff/assets --app-name "My App"
          </code>
        </div>
        <div className="flex items-center justify-center flex-wrap gap-6 mt-8">
          <Link
            to="/docs/$"
            params={{ _splat: "getting-started" }}
            className={buttonVariants({
              className:
                "flex items-center justify-center bg-fd-foreground text-fd-background hover:opacity-90 font-bold h-11 text-[14px] rounded-lg gap-2 px-4 shadow-lg group",
            })}
          >
            Get Started
            <ExternalLink className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="https://www.npmjs.com/package/@swoff/assets"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              variant: "outline",
              className:
                "flex items-center justify-center border-fd-border text-fd-foreground hover:bg-fd-success/95 bg-fd-success font-bold h-11 px-4 text-[14px] rounded-lg gap-2 shadow-md",
            })}
          >
            <Icons.npm className="size-8" />
            package
          </a>
        </div>
      </div>
    </section>
  );
}
