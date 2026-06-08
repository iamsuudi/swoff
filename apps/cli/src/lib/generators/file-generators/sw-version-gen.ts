import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { GeneratorContext, writeFile } from "./context.js";
import { generateSwVersionCode } from "../../../runtime/sw-version.js";

export function generateSwVersion(ctx: GeneratorContext): void {
  const v = ctx.config.features.serviceWorker.version;

  let version: string;
  if (v === "hash") {
    version = "0.0.0";
  } else if (v === "package") {
    const pkgPath = join(ctx.projectRoot, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        version = pkg.version || "1.0.0";
      } catch {
        version = "1.0.0";
      }
    } else {
      version = "1.0.0";
    }
  } else {
    // "manual" — start with a default; user edits this file directly
    version = "1.0.0";
  }

  writeFile(
    ctx,
    `sw-version.${ctx.ext}`,
    generateSwVersionCode({ ts: ctx.ext === "ts", ext: ctx.ext, version }),
  );
}
