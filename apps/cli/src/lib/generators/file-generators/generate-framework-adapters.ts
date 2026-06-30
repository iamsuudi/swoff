import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { GeneratorContext } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "../../../../templates");

function copyAdapter(frameworkDir: string, name: string, ext: string, outputDir: string) {
  const primarySrc = join(frameworkDir, `${name}.${ext}x`);
  if (existsSync(primarySrc)) {
    copyFileSync(primarySrc, join(outputDir, `${name}.${ext}x`));
    return;
  }
  const fallbackExt = ext === "ts" ? "jsx" : "tsx";
  const fallbackSrc = join(frameworkDir, `${name}.${fallbackExt}`);
  if (existsSync(fallbackSrc)) {
    copyFileSync(fallbackSrc, join(outputDir, `${name}.${ext}x`));
  }
}

interface AdapterDef {
  name: string;
  condition?: (ctx: GeneratorContext) => boolean;
}

const ADAPTERS: AdapterDef[] = [
  { name: "useNetworkStatus", condition: (c) => c.config.features.connectivity.enabled },
  { name: "useStorageEstimate" },
  { name: "useCachedFetch", condition: (c) => c.config.features.tagInvalidation.enabled },
  { name: "useMutation", condition: (c) => c.config.features.mutationQueue.enabled },
  { name: "usePrefetch", condition: (c) => c.config.features.tagInvalidation.enabled },
  { name: "useMutationState", condition: (c) => c.config.features.mutationQueue.enabled },
  { name: "useSwoffReset" },
  { name: "useOfflineAnalytics" },
  { name: "usePrecacheProgress" },
  { name: "useAuth", condition: (c) => c.config.features.auth.enabled },
  { name: "useMutationQueue", condition: (c) => c.config.features.mutationQueue.enabled },
  { name: "usePwaInstall", condition: (c) => c.config.features.pwa.enabled },
  { name: "usePushSubscription", condition: (c) => c.config.features.pushNotifications },
  { name: "useBackgroundSync", condition: (c) => !!c.config.features.mutationQueue.backgroundSync },
];

const BASE_FRAMEWORK: Record<string, string> = {
  nextjs: "react",
  remix: "react",
  "react-spa": "react",
  "tanstack-start-react": "react",
  astro: "react",
};

const OUTPUT_SUBDIRS: Record<string, string> = {
  react: "adapters",
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
