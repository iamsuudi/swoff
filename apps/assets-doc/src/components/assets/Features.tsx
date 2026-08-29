import {
  AppWindow,
  FileCode,
  FileJson,
  Image,
  Layers,
  Moon,
  Smartphone,
  Tablet,
  Terminal,
  Type,
} from "lucide-react";

const assetFeatures = [
  {
    icon: Image,
    title: "PWA Icons",
    desc: "64×64, 192×192, and 512×512 icons plus maskable variants with an 80% safe-zone crop.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Moon,
    title: "Dark Mode Icons",
    desc: "Dark theme icon set via prefers-color-scheme media queries — light and dark from one source.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Smartphone,
    title: "Apple Splash Screens",
    desc: "Seven iOS launch screen sizes, 640×1136 through 2048×2732.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: AppWindow,
    title: "Microsoft Tiles",
    desc: "browserconfig.xml + tile images to pin to the Windows taskbar like a native app.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Tablet,
    title: "OG & Favicon",
    desc: "1200×630 social share image, multi-resolution favicon.ico, SVG favicon, and Apple Touch Icon.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: FileJson,
    title: "manifest.json",
    desc: "Full manifest with icons, screenshots, shortcuts, colors, orientation, scope, and lang.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: FileCode,
    title: "HTML Head Tags",
    desc: "Copy-paste swoff-head-tags.html with every <link> and <meta> tag for your <head>.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Terminal,
    title: "Standalone CLI",
    desc: "No build tool, framework, or service worker dependency — works with any stack.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Type,
    title: "Wordmark Auto",
    desc: "No source? A rounded-rect wordmark from --app-name in the theme color, with bitmap-font fallback.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: Layers,
    title: "Android Adaptive Icons",
    desc: "Add --android for the mipmap stack: density-scaled launchers, 66% safe-zone foreground, and anydpi-v26 XMLs.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

export function Features() {
  return (
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
            Everything you need for a production PWA — platform-ready, right out
            of the box.
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
  );
}