import type { RuntimeContext } from "./utils.js";

export function generateSwVersionCode(
  ctx: RuntimeContext & { version: string },
): string {
  return `/**
 * Swoff SW Version
 *
 * Developer-editable version used for SW URL and cache naming.
 * - "package" mode:  The build script overwrites this from package.json
 * - "manual" mode:   Edit this file directly to bump the version
 * - "hash" mode:     Not used (SW URL is fixed, cache is content-addressed)
 */
export const SW_VERSION = ${JSON.stringify(ctx.version)};
`;
}
