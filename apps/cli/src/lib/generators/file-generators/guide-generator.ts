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
  w("- **Documentation** — *URL TBD*");
  w("");
  w("Or run `swoff info <feature>` for targeted help.");
  w("```");
  w("swoff info mutation-queue");
  w("swoff info auth");
  w("swoff info tag-invalidation");
  w("swoff info stale-time");
  w("```");

  writeFile(ctx, "GUIDE.md", lines.join("\n"));
}
