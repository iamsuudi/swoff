import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { GeneratorContext } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "../../../../templates");

function copyAdapter(frameworkDir: string, name: string, ext: string, outputDir: string) {
  const src = join(frameworkDir, `${name}.${ext}x`);
  if (existsSync(src)) {
    copyFileSync(src, join(outputDir, `${name}.${ext}x`));
  } else {
    const jsSrc = src.replace(`.${ext}x`, ".jsx");
    if (existsSync(jsSrc)) {
      copyFileSync(jsSrc, join(outputDir, `${name}.${ext}x`));
    }
  }
}

interface AdapterDef {
  name: string;
  condition?: (ctx: GeneratorContext) => boolean;
}

const ADAPTERS: AdapterDef[] = [
  { name: "useNetworkStatus" },
  { name: "useStorageEstimate" },
  { name: "useCachedFetch" },
  { name: "useMutation" },
  { name: "usePrefetch" },
  { name: "useMutationState" },
  { name: "useCacheInvalidation" },
  { name: "useSwoffReset" },
  { name: "useIsFetching" },
  { name: "useOfflineAnalytics" },
  { name: "useSWUpdate", condition: (c) => c.config.features.pwa.enabled },
  { name: "useAuth", condition: (c) => c.config.features.auth.enabled },
  { name: "useMutationQueue", condition: (c) => c.config.features.mutationQueue.enabled },
  { name: "usePushSubscription", condition: (c) => c.config.features.pushNotifications?.enabled ?? false },
  { name: "useBackgroundSync", condition: (c) => !!c.config.features.mutationQueue.backgroundSync },
];

const BASE_FRAMEWORK: Record<string, string> = {
  nextjs: "react",
  remix: "react",
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
