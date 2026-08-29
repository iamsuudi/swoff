const generatedFiles = [
  { name: "icon-64.png", size: "64×64" },
  { name: "icon-192.png", size: "192×192" },
  { name: "icon-512.png", size: "512×512" },
  { name: "maskable-icon-96.png", size: "96×96" },
  { name: "maskable-icon-192.png", size: "192×192" },
  { name: "maskable-icon-512.png", size: "512×512" },
  { name: "apple-touch-icon.png", size: "180×180" },
  { name: "mipmap-*, ic_launcher*", size: "16 (--android)" },
  { name: "favicon.ico", size: "16+32+48" },
  { name: "favicon.svg", size: "SVG" },
  { name: "og-image.png", size: "1200×630" },
  { name: "splash-*.png", size: "7 (--splash)" },
  { name: "manifest.json", size: "—" },
  { name: "swoff-head-tags.html", size: "—" },
  { name: "pwa-debug.html", size: "—" },
];

export function GeneratedFiles() {
  return (
    <section className="relative py-20 overflow-hidden border-t border-fd-border">
      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
            Generated Files
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto">
            All placed in your output directory — ready to deploy.
          </p>
        </div>

        <div className="overflow-x-auto [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden rounded-xl border border-fd-border bg-fd-card">
          <table className="w-full text-sm min-w-75">
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
  );
}
