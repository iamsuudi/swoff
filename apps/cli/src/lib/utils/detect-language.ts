/**
 * Detects whether the project uses TypeScript or JavaScript.
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

export function detectProjectLanguage(projectRoot: string): "ts" | "js" {
  if (existsSync(join(projectRoot, "tsconfig.json"))) return "ts";

  const pkgPath = join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) return "ts";
    } catch {}
  }

  const srcDir = join(projectRoot, "src");
  if (existsSync(srcDir)) {
    const tsFiles = ["ts", "tsx"].some((ext) => {
      try {
        return readdirSync(srcDir, { withFileTypes: true }).some(
          (entry) => entry.isFile() && entry.name.endsWith(`.${ext}`),
        );
      } catch {
        return false;
      }
    });
    if (tsFiles) return "ts";
  }

  return "js";
}
