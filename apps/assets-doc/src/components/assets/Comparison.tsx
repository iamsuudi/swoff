const comparisons = [
  {
    feature: "Standalone CLI (no build tool)",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✗",
    workbox: "✗",
  },
  {
    feature: "Wordmark auto (no source)",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✗",
    workbox: "✗",
  },
  {
    feature: "Android adaptive icons",
    swoff: "✓",
    vitePwa: "✗",
    pwaBuilder: "✓",
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

const keys = ["swoff", "vitePwa", "pwaBuilder", "workbox"] as const;

export function Comparison() {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-4">
            How It Compares
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-lg mx-auto">
            The only standalone PWA asset generator — no build tool required.
          </p>
        </div>

        <div className="overflow-x-auto [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden rounded-xl border border-fd-border bg-fd-card">
          <table className="w-full text-sm min-w-125">
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
                  {keys.map((key) => (
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
  );
}
