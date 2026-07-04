import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Image,
  Moon,
  Monitor,
  Tablet,
  Smartphone,
  FileJson,
  FileCode,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Icons } from "@/components/icons";

export const Route = createFileRoute("/assets")({
  component: AssetsPage,
});

const assetFeatures = [
  {
    icon: Image,
    title: "PWA Icons",
    desc: "Generate 64×64, 192×192, and 512×512 icons plus maskable variants with a 80% safe-zone crop.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Moon,
    title: "Dark Mode Icons",
    desc: "Optional dark theme icon set with prefers-color-scheme media queries. Light and dark variants from a single source.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Smartphone,
    title: "Apple Splash Screens",
    desc: "Seven device-specific launch screen sizes (640×1136 through 2048×2732) — one for every iPhone and iPad resolution Apple ships.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Monitor,
    title: "Microsoft Tiles",
    desc: "browserconfig.xml + tile images for pinning to the Windows taskbar. Pin your PWA like a native app.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Tablet,
    title: "OG & Favicon",
    desc: "1200×630 social share image, multi-resolution favicon.ico (16+32+48), SVG favicon, and Apple Touch Icon (180×180).",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: FileJson,
    title: "manifest.json",
    desc: "Full Web App Manifest with icons, screenshots (narrow + wide), shortcuts, theme color, and background color — ready to deploy.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: FileCode,
    title: "HTML Head Tags",
    desc: "A ready-to-copy swoff-head-tags.html file with all <link> and <meta> tags. Paste straight into your document <head>.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Terminal,
    title: "Standalone CLI",
    desc: "No build tool, no framework, no service worker dependency. Works with any stack — Jamstack, MPA, SPA, static site, or plain HTML.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

const generatedFiles = [
  { name: "icon-64.png", size: "64×64" },
  { name: "icon-192.png", size: "192×192" },
  { name: "icon-512.png", size: "512×512" },
  { name: "maskable-icon-96.png", size: "96×96" },
  { name: "maskable-icon-192.png", size: "192×192" },
  { name: "maskable-icon-512.png", size: "512×512" },
  { name: "apple-touch-icon.png", size: "180×180" },
  { name: "favicon.ico", size: "16+32+48" },
  { name: "favicon.svg", size: "SVG" },
  { name: "og-image.png", size: "1200×630" },
  { name: "splash-*.png", size: "7 sizes" },
  { name: "manifest.json", size: "—" },
  { name: "swoff-head-tags.html", size: "—" },
];

const comparisons = [
  {
    feature: "Standalone CLI (no build tool)",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✗",
    workbox: "✗",
  },
  {
    feature: "Dark mode icons",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✗",
    workbox: "✗",
  },
  {
    feature: "Monochrome icons",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✗",
    workbox: "✗",
  },
  {
    feature: "Microsoft Tile icons + XML",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✗",
    workbox: "✗",
  },
  {
    feature: "Apple splash screens (7 sizes)",
    swoff: "✓",
    vitePwa: "✓",
    pwaBuilder: "✗",
    workbox: "✗",
  },
  {
    feature: "manifest.json generation",
    swoff: "✓",
    vitePwa: "✓",
    pwaBuilder: "✓",
    workbox: "✗",
  },
  {
    feature: "Head tag HTML output",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✗",
    workbox: "✗",
  },
];

function AssetsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-fd-background text-fd-foreground">
      <Navbar />

      {/* Hero */}
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
                Generate 31+ PWA Assets
                <br />
                <span className="bg-linear-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  From One SVG
                </span>
              </h1>

              <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mt-6 mb-10 leading-relaxed mx-auto">
                Icons, splash screens, favicons, Apple touch icons, OG images,
                Microsoft tiles, and a full{" "}
                <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">
                  manifest.json
                </code>{" "}
                — all from a single source image. No build tool required, no
                service worker coupling, no framework lock-in.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <code className="px-5 py-3 rounded-lg bg-fd-muted border border-fd-border text-sm font-mono text-fd-foreground">
                  npx @swoff/assets --source ./logo.svg
                </code>
              </div>
              <p className="text-xs text-fd-muted-foreground mt-3">
                Works with SVG, PNG, and JPG sources
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-fd-foreground/1.5 dark:bg-fd-foreground/3 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              What You Get
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need for a production PWA — platform-ready, right
              out of the box.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {assetFeatures.map((f) => (
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

      {/* Generated files */}
      <section className="relative py-20 overflow-hidden border-t border-fd-border">
        <div className="max-w-3xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              Generated Files
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto">
              All placed in your output directory — ready to deploy.
            </p>
          </div>

          <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-fd-border bg-fd-card">
            <table className="w-full text-sm min-w-[300px]">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/50">
                  <th className="text-left px-5 py-3 font-semibold text-fd-foreground">
                    File
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-fd-foreground">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {generatedFiles.map((f, i) => (
                  <tr
                    key={f.name}
                    className={
                      i < generatedFiles.length - 1
                        ? "border-b border-fd-border/50"
                        : ""
                    }
                  >
                    <td className="px-5 py-2.5 font-mono text-xs text-fd-foreground whitespace-nowrap">
                      {f.name}
                    </td>
                    <td className="px-5 py-2.5 text-fd-muted-foreground whitespace-nowrap">
                      {f.size}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="relative py-20 overflow-hidden border-t border-fd-border">
        <div className="max-w-4xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
              How It Compares
            </h2>
            <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto">
              The only standalone PWA asset generator — no build tool required.
            </p>
          </div>

          <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-fd-border bg-fd-card">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/50">
                  <th className="text-left px-5 py-3 font-semibold text-fd-foreground">
                    Feature
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-fd-foreground whitespace-nowrap">
                    <span className="text-green-500">@swoff/assets</span>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-fd-muted-foreground text-xs">
                    @vite-pwa/assets-generator
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-fd-muted-foreground text-xs">
                    PWABuilder
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-fd-muted-foreground text-xs">
                    Workbox CLI
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i < comparisons.length - 1
                        ? "border-b border-fd-border/50"
                        : ""
                    }
                  >
                    <td className="px-5 py-3 text-fd-foreground">
                      {row.feature}
                    </td>
                    {(
                      ["swoff", "vitePwa", "pwaBuilder", "workbox"] as const
                    ).map((key) => (
                      <td
                        key={key}
                        className={`text-center px-4 py-3 text-lg ${
                          row[key] === "✓" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {row[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-green-500/5 dark:bg-green-500/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 text-center relative">
          <h2 className="text-4xl md:text-5xl font-black text-fd-foreground mb-6">
            Ready to generate?
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto mb-10">
            One command. One source file. 31+ production-ready assets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <code className="px-5 py-3 rounded-lg bg-fd-muted border border-fd-border text-sm font-mono text-fd-foreground">
              npx @swoff/assets --source ./logo.svg
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

      {/* Footer */}
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
