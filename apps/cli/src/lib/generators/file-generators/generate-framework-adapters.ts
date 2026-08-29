import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { GeneratorContext } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "../../../../templates");

/**
 * Generated-module specifiers (without extension) that framework adapters may
 * import from `swoff/`. Only these get rewritten during emission, so edits the
 * user makes to templates and imports of unrelated modules are left untouched.
 */
const KNOWN_MODULES = new Set([
  "auth/adapter",
  "auth/state",
  "auth/store",
  "cache/tags",
  "cache/invalidate",
  "connectivity",
  "config",
  "db",
  "fetch/core",
  "graphql/index",
  "mutation/queue",
  "mutation/state",
  "mutation/sync",
  "push-notification/index",
  "pwa/prompt",
  "reset",
  "server-push/client",
  "storage",
  "swoff.d",
]);

/**
 * Paths in older templates that no longer match the emitted layout.
 * Maps the stale template specifier (no extension) to the real generated one.
 */
const MODULE_ALIASES: Record<string, string> = {
  "realtime/notifications": "push-notification/index",
};

function resolvesInProject(specifier: string, ext: "ts" | "js"): string {
  const target = MODULE_ALIASES[specifier] ?? specifier;
  if (target === "swoff.d") return "swoff.d.ts";
  return `${target}.${ext}`;
}

/**
 * Rewrites relative `from "<…>"` specifiers that target generated `swoff/`
 * modules so they always carry an explicit extension matching the project
 * language (`.ts`/`.js`). Also fixes stale module paths from older templates.
 */
export function rewriteAdapterSource(source: string, ext: "ts" | "js"): string {
  return source.replace(
    /(from\s+["']\.\.\/)([^"']+)(["'])/g,
    (_match, prefix: string, spec: string, suffix: string) => {
      const clean = spec.replace(/\.(ts|js|tsx|jsx|d\.ts)$/, "");
      if (!KNOWN_MODULES.has(clean) && !MODULE_ALIASES[clean]) return _match;
      return `${prefix}${resolvesInProject(clean, ext)}${suffix}`;
    },
  );
}

/**
 * Output extension for an emitted adapter. React-family templates use JSX
 * (`.tsx`/`.jsx`); Vue/Svelte families emit plain modules (`.ts`/`.js`).
 */
function adapterOutputExt(baseFramework: string, ext: "ts" | "js"): string {
  if (baseFramework === "react") return `${ext}x`;
  return ext;
}

function readAdapter(
  frameworkDir: string,
  name: string,
  baseFramework: string,
  ext: "ts" | "js",
): { content: string; output: string } | null {
  const outputExt = adapterOutputExt(baseFramework, ext);
  const candidates =
    baseFramework === "react"
      ? [`${name}.${ext}x`, `${name}.${ext}`, `${name}.${ext === "ts" ? "jsx" : "tsx"}`]
      : [`${name}.${ext}`, `${name}.${ext}x`];
  for (const candidate of candidates) {
    const src = join(frameworkDir, candidate);
    if (!existsSync(src)) continue;
    const content = rewriteAdapterSource(readFileSync(src, "utf8"), ext);
    return { content, output: `${name}.${outputExt}` };
  }
  return null;
}

interface AdapterDef {
  name: string;
  condition?: (ctx: GeneratorContext) => boolean;
}

const ADAPTERS: AdapterDef[] = [
  { name: "useSwoffNetwork", condition: (c) => c.config.features.connectivity.enabled },
  { name: "useSwoffStorage" },
  { name: "useSwoffFetch", condition: (c) => c.config.features.tagInvalidation.enabled },
  { name: "useSwoffMutation", condition: (c) => c.config.features.mutationQueue.enabled },
  { name: "useSwoffPrefetch", condition: (c) => c.config.features.tagInvalidation.enabled },
  { name: "useSwoffMutationState", condition: (c) => c.config.features.mutationQueue.enabled },
  { name: "useSwoffReset" },
  { name: "useSwoffAnalytics" },
  { name: "useSwoffPrecache" },
  { name: "useSwoffAuth", condition: (c) => c.config.features.auth.enabled },
  { name: "useSwoffQueue", condition: (c) => c.config.features.mutationQueue.enabled },
  { name: "useSwoffPwa", condition: (c) => c.config.features.pwa.enabled },
  { name: "useSwoffPush", condition: (c) => c.config.features.pushNotifications },
  { name: "useSwoffSync", condition: (c) => !!c.config.features.mutationQueue.backgroundSync },
];

const BASE_FRAMEWORK: Record<string, string> = {
  nextjs: "react",
  remix: "react",
  "react": "react",
  "tanstack-start-react": "react",
  astro: "react",
  nuxt: "vue",
  quasar: "vue",
  vitepress: "vue",
  sveltekit: "svelte",
  vike: "vue",
};

const OUTPUT_SUBDIRS: Record<string, string> = {
  react: "adapters",
  vue: "adapters",
  svelte: "adapters",
};

export function generateFrameworkAdapters(ctx: GeneratorContext): void {
  const baseFramework = BASE_FRAMEWORK[ctx.frameworkName] ?? ctx.frameworkName;
  const subdir = OUTPUT_SUBDIRS[baseFramework];
  if (!subdir) return;

  const frameworkDir = join(templatesDir, baseFramework);
  if (!existsSync(frameworkDir)) return;

  const outDir = join(ctx.swoffDir, subdir);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  for (const a of ADAPTERS) {
    if (a.condition && !a.condition(ctx)) continue;
    const adapter = readAdapter(frameworkDir, a.name, baseFramework, ctx.ext as "ts" | "js");
    if (!adapter) continue;
    const relPath = join(ctx.config.build?.swoffPath || "swoff", subdir, adapter.output);
    const outPath = join(ctx.swoffDir, subdir, adapter.output);
    writeFileSync(outPath, adapter.content);
    ctx.generatedFiles.push(relPath);
  }
}