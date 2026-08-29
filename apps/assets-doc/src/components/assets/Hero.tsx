import { Image } from "lucide-react";
import { Cta } from "./Cta";
import { buttonVariants } from "../ui/button";

export function Hero() {
  return (
    <section className="relative pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-green-500/5 dark:bg-green-500/8 rounded-full blur-[100px]" />
      </div>
      <div className="container mx-auto px-6 relative">
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-2 px-4 py-1 rounded-full border border-fd-border bg-fd-card text-sm text-fd-muted-foreground mb-8">
            <Image className="size-3 text-green-500" />
            <span className="text-xs">
              @swoff/assets — Standalone PWA Asset Generator
            </span>
          </div>

          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-fd-foreground leading-[1.05]">
              Generate 50+ PWA Assets
              <br />
              <span className="bg-linear-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                From One Source
              </span>
            </h1>

            <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mt-6 mb-10 leading-relaxed mx-auto">
              Icons, splash screens, Android adaptive icons, favicons, OG
              images, Microsoft tiles, and a full{" "}
              <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">
                manifest.json
              </code>{" "}
              — from one source image, or a generated wordmark when you don't
              have one.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 text-center relative">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <code className="px-5 py-3 rounded-lg bg-fd-muted border border-fd-border text-sm font-mono text-fd-foreground">
            npx @swoff/assets --app-name "My App"
          </code>
        </div>
        <p className="text-xs text-fd-muted-foreground mt-3">
          Works with SVG, PNG, and JPG sources — or no source at all
        </p>
        <div className="flex items-center justify-center flex-wrap gap-6 mt-8">
          <a
            href="https://github.com/iamsuudi/swoff"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center bg-primary text-white hover:opacity-90 font-bold h-11 text-[14px] rounded-lg gap-2 px-4 shadow-lg group"
          >
            Github
            <GithubIcon className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="https://www.npmjs.com/package/@swoff/assets"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center border-fd-border text-background bg-fd-foreground hover:bg-fd-foreground/90 font-bold h-11 text-[14px] rounded-lg gap-2 px-4 shadow-md"
          >
            <NpmIcon className="size-6" />
            npm
          </a>
        </div>
      </div>
    </section>
  );
}

function NpmIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M2 38.5h124v43.71H64v7.29H36.44v-7.29H2zm6.89 36.43h13.78V53.07h6.89v21.86h6.89V45.79H8.89zm34.44-29.14v36.42h13.78v-7.28h13.78V45.79zm13.78 7.29H64v14.56h-6.89zm20.67-7.29v29.14h13.78V53.07h6.89v21.86h6.89V53.07h6.89v21.86h6.89V45.79z"
      />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
