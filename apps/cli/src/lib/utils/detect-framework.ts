import { readFileSync, existsSync } from "fs";
import { join } from "path";

const REACT_DEPS = [
  "react",
  "react-dom",
  "react-router-dom",
  "remix",
  "@remix-run/react",
];

export type FrameworkName =
  | "nextjs"
  | "remix"
  | "astro"
  | "nuxt"
  | "sveltekit"
  | "react"
  | "vue"
  | "svelte"
  | "vanilla";

const META_FRAMEWORKS: [string, FrameworkName][] = [
  ["next", "nextjs"],
  ["@remix-run/react", "remix"],
  ["remix", "remix"],
  ["astro", "astro"],
  ["nuxt", "nuxt"],
  ["@sveltejs/kit", "sveltekit"],
];

const BASE_FRAMEWORKS: [string, FrameworkName][] = [
  ["vue", "vue"],
  ["svelte", "svelte"],
];

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

  // Check meta-frameworks first (they may also have base framework deps)
  for (const [dep, name] of META_FRAMEWORKS) {
    if (allDeps[dep]) return name;
  }

  // Check base frameworks
  for (const [dep, name] of BASE_FRAMEWORKS) {
    if (allDeps[dep]) return name;
  }

  if (REACT_DEPS.some((d) => allDeps[d])) return "react";

  return "vanilla";
}
