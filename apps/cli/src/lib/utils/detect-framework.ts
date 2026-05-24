import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface ProjectInfo {
  framework: "react" | "vue" | "svelte" | "vanilla";
  bundler: "vite" | "nextjs" | "nuxt" | "sveltekit" | "remix" | "tanstack-router" | "tanstack-start" | "unknown";
}

export function detectFramework(projectRoot: string): ProjectInfo {
  const pkgPath = join(projectRoot, "package.json");
  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      deps = pkg.dependencies || {};
      devDeps = pkg.devDependencies || {};
    } catch {}
  }

  const allDeps = { ...deps, ...devDeps };

  let framework: ProjectInfo["framework"] = "vanilla";
  if (deps.react || devDeps.react || deps["react-dom"] || devDeps["react-dom"]) {
    framework = "react";
  } else if (deps.vue || devDeps.vue) {
    framework = "vue";
  } else if (deps.svelte || devDeps.svelte) {
    framework = "svelte";
  }

  let bundler: ProjectInfo["bundler"] = "unknown";
  if (allDeps["@tanstack/start"] || allDeps["@tanstack/react-start"] || allDeps["@tanstack/vue-start"]) {
    bundler = "tanstack-start";
  } else if (allDeps["@tanstack/react-router"]) {
    bundler = "tanstack-router";
  } else if (existsSync(join(projectRoot, "next.config.js")) || existsSync(join(projectRoot, "next.config.ts")) || existsSync(join(projectRoot, "next.config.mjs"))) {
    bundler = "nextjs";
  } else if (existsSync(join(projectRoot, "nuxt.config.js")) || existsSync(join(projectRoot, "nuxt.config.ts")) || existsSync(join(projectRoot, "nuxt.config.mjs"))) {
    bundler = "nuxt";
  } else if (existsSync(join(projectRoot, "svelte.config.js")) || existsSync(join(projectRoot, "svelte.config.ts"))) {
    bundler = "sveltekit";
  } else if (existsSync(join(projectRoot, "remix.config.js")) || existsSync(join(projectRoot, "remix.config.ts"))) {
    bundler = "remix";
  } else if (existsSync(join(projectRoot, "vite.config.ts")) || existsSync(join(projectRoot, "vite.config.js")) || existsSync(join(projectRoot, "vite.config.mjs"))) {
    bundler = "vite";
  }

  return { framework, bundler };
}
