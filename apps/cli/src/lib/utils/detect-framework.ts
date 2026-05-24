import { readFileSync, existsSync } from "fs";
import { join } from "path";

const REACT_DEPS = [
  "react",
  "react-dom",
  "react-router-dom",
  "remix",
  "@remix-run/react",
];

export type FrameworkName = "react" | "vue" | "svelte" | "vanilla";

export function detectFramework(projectRoot: string): FrameworkName {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return "vanilla";

  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    deps = pkg.dependencies || {};
    devDeps = pkg.devDependencies || {};
  } catch {
    return "vanilla";
  }

  const allDeps = { ...deps, ...devDeps };

  if (REACT_DEPS.some((d) => allDeps[d])) return "react";
  if (allDeps.vue) return "vue";
  if (allDeps.svelte) return "svelte";

  return "vanilla";
}
