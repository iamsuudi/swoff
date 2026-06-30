import { readFileSync, existsSync } from "fs";
import { join } from "path";

const REACT_DEPS = [
  "react",
  "react-dom",
  "react-router-dom",
  "@tanstack/react-router",
  "remix",
  "@remix-run/react",
];

export type FrameworkName =
  | "nextjs"
  | "remix"
  | "tanstack-start-react"
  | "astro"
  | "nuxt"
  | "sveltekit"
  | "react-spa"
  | "vue"
  | "svelte"
  | "vanilla"
  | "no-bundler";

const META_FRAMEWORKS: [string, FrameworkName][] = [
  ["next", "nextjs"],
  ["@remix-run/react", "remix"],
  ["remix", "remix"],
  ["@tanstack/react-start", "tanstack-start-react"],
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
  if (!existsSync(pkgPath)) {
    return "no-bundler";
  }

  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    deps = pkg.dependencies || {};
    devDeps = pkg.devDependencies || {};
  } catch {
    return "no-bundler";
  }

  const allDeps = { ...deps, ...devDeps };

  for (const [dep, name] of META_FRAMEWORKS) {
    if (allDeps[dep]) return name;
  }

  for (const [dep, name] of BASE_FRAMEWORKS) {
    if (allDeps[dep]) return name;
  }

  if (REACT_DEPS.some((d) => allDeps[d])) return "react-spa";

  return "vanilla";
}
