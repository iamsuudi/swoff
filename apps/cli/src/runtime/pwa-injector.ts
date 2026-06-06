import type { RuntimeContext } from "./utils.js";

export function generatePwaInjectorCode(ctx: RuntimeContext): string {
  const { ext } = ctx;

  return `/**
 * Swoff PWA Injector
 * Re-exports setupPwaInstall from the prompt module.
 *
 * Usage:
 *   import { setupPwaInstall } from './swoff/pwa/injector.${ext}';
 *   setupPwaInstall();
 */

export { setupPwaInstall } from "./prompt.${ext}";
`;
}
