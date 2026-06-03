import type { RuntimeContext } from "./utils.js";

export function generatePwaIndexCode(ctx: RuntimeContext): string {
  const { ext } = ctx;

  return `/**
 * Swoff PWA
 * Re-exports from PWA sub-modules for convenience imports.
 */
export { setupPwaInstall } from "./injector.${ext}";
export { isInstallable, promptInstall } from "./prompt.${ext}";
`;
}
