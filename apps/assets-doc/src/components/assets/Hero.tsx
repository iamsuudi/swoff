import { Image } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-fd-foreground/1.5 dark:bg-fd-foreground/3 rounded-full blur-[100px]" />
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <code className="px-5 py-3 rounded-lg bg-fd-muted border border-fd-border text-sm font-mono text-fd-foreground">
                npx @swoff/assets --app-name "My App"
              </code>
            </div>
            <p className="text-xs text-fd-muted-foreground mt-3">
              Works with SVG, PNG, and JPG sources — or no source at all
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
