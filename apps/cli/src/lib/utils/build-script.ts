/**
 * Utilities for managing the SW generator step in package.json build scripts.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SW_GENERATOR_STEP = " && node swoff/sw/generator.js";

export function appendGeneratorToBuildScript(projectRoot: string): boolean {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return false;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const build = pkg.scripts?.build;

  if (!build || typeof build !== "string") return false;
  if (build.includes(SW_GENERATOR_STEP)) return false;

  pkg.scripts.build = build + SW_GENERATOR_STEP;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return true;
}

export function removeGeneratorFromBuildScript(projectRoot: string): boolean {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return false;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const build = pkg.scripts?.build;

  if (!build || typeof build !== "string") return false;
  if (!build.includes(SW_GENERATOR_STEP)) return false;

  pkg.scripts.build = build.replace(SW_GENERATOR_STEP, "");
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return true;
}
