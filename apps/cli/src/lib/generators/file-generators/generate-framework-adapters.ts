import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { GeneratorContext } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "../../../../templates");

function copyAdapter(frameworkDir: string, name: string, ext: string, outputDir: string) {
  // Try plain ext first (Vue: .ts/.js), then JSX variant (React: .tsx/.jsx),
  // then opposite JSX fallback (tsx→jsx, jsx→tsx)
  const extensions = [`.${ext}`, `.${ext}x`, ext === "ts" ? ".jsx" : ".tsx"];
  for (const e of extensions) {
    const src = join(frameworkDir, `${name}${e}`);
    if (existsSync(src)) {
      copyFileSync(src, join(outputDir, `${name}.${ext}x`));
      return;
    }
  }
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
    if (!a.condition || a.condition(ctx)) {
      copyAdapter(frameworkDir, a.name, ctx.ext, outDir);
    }
  }
}
