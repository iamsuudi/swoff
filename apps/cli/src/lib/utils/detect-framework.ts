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
  | "laravel"
  | "django"
  | "flask"
  | "rails"
  | "go"
  | "vanilla";

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

function probeBackend(projectRoot: string): FrameworkName | null {
  if (existsSync(join(projectRoot, "composer.json"))) return "laravel";
  if (existsSync(join(projectRoot, "manage.py"))) return "django";
  if (existsSync(join(projectRoot, "app.py"))) return "flask";
  const reqPath = join(projectRoot, "requirements.txt");
  if (existsSync(reqPath)) {
    const req = readFileSync(reqPath, "utf8");
    if (/^flask\b/im.test(req)) return "flask";
    if (/^django\b/im.test(req)) return "django";
  }
  if (existsSync(join(projectRoot, "Gemfile"))) return "rails";
  if (existsSync(join(projectRoot, "go.mod"))) return "go";
  return null;
}

export function detectFramework(projectRoot: string): FrameworkName {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) {
    const backend = probeBackend(projectRoot);
    return backend ?? "vanilla";
  }

  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    deps = pkg.dependencies || {};
    devDeps = pkg.devDependencies || {};
  } catch {
    const backend = probeBackend(projectRoot);
    return backend ?? "vanilla";
  }

  const allDeps = { ...deps, ...devDeps };

  for (const [dep, name] of META_FRAMEWORKS) {
    if (allDeps[dep]) return name;
  }

  for (const [dep, name] of BASE_FRAMEWORKS) {
    if (allDeps[dep]) return name;
  }

  if (REACT_DEPS.some((d) => allDeps[d])) return "react-spa";

  const backend = probeBackend(projectRoot);
  return backend ?? "vanilla";
}
