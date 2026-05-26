/**
 * Generates sw-template.js - the SW template with config features baked in.
 * Placeholders are replaced during build by sw-generator.js.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { assembleSW } from "../sw-sections/assemble-sw.js";

export function generateSwTemplate(ctx: GeneratorContext): void {
  const placeholderVersion = "0.0.0";
  const full = assembleSW(ctx.config, placeholderVersion);

  let code = full;

  code = code.replace(
    `CACHE_NAME = 'sw-v${placeholderVersion}'`,
    "// [[CACHE_NAME]]",
  );

  code = code.replace(
    /^ASSETS_TO_CACHE = \[[\s\S]*?\]$/m,
    "// [[ASSETS_LIST]]",
  );

  code = code.replace(
    /^const AUTO_SKIP_WAITING = (true|false);?$/m,
    "// [[AUTO_SKIP_WAITING]]",
  );

  // Dev mode fallback — if placeholders weren't replaced, use a dev cache name
  code += `\n// Dev mode fallback\nif (!CACHE_NAME) CACHE_NAME = "sw-dev-cache";\n`;

  writeFile(ctx, "sw/template.js", code);
}
