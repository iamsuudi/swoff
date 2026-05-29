import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { GeneratorContext } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "../../../../templates/hooks");

function copyHook(hooksDir: string, name: string, ext: string) {
  const src = join(templatesDir, `${name}.${ext}x`);
  copyFileSync(src, join(hooksDir, `${name}.${ext}x`));
}

export function generateHooks(ctx: GeneratorContext): void {
  const { config, swoffDir, ext, frameworkName } = ctx;
  if (frameworkName !== "react") return;

  const hooksDir = join(swoffDir, "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  // Always generated hooks
  copyHook(hooksDir, "useNetworkStatus", ext);
  copyHook(hooksDir, "useCachedFetch", ext);
  copyHook(hooksDir, "useMutation", ext);
  copyHook(hooksDir, "usePrefetch", ext);
  copyHook(hooksDir, "useMutationState", ext);

  if (config.features.pwa.enabled) {
    copyHook(hooksDir, "useSWUpdate", ext);
  }
  if (config.features.auth.enabled) {
    copyHook(hooksDir, "useAuth", ext);
  }
  if (config.features.mutationQueue.enabled) {
    copyHook(hooksDir, "useMutationQueue", ext);
  }
  if (config.features.pushNotifications?.enabled) {
    copyHook(hooksDir, "usePushSubscription", ext);
  }
  if (config.features.backgroundSync) {
    copyHook(hooksDir, "useBackgroundSync", ext);
  }
  if (typeof config.features.tagInvalidation === "boolean" ? config.features.tagInvalidation : config.features.tagInvalidation.enabled) {
    copyHook(hooksDir, "useCacheInvalidation", ext);
  }
}
