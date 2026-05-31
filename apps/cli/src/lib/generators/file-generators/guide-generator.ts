/**
 * Generates GUIDE.md — points user to online documentation.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateGuide(ctx: GeneratorContext): void {
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  w("# Swoff — Generated Files");
  w("");
  w(
    "Your project was generated with Swoff. All generated files live in `swoff/`.",
  );
  w("");
  w("For the full documentation, visit:");
  w("");
  w("- **Documentation** — https://swoff.dev/docs");
  w("");
  w("- **CLI Reference** — `swoff generate`, `swoff validate`, etc. See [CLI.md](./CLI.md)");
  w("");

  writeFile(ctx, "GUIDE.md", lines.join("\n"));
}
