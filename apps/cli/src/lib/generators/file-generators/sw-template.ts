/**
 * Generates sw-template.js - the SW template with config features baked in.
 * Placeholders are replaced during build by sw-generator.mjs.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { getDefaultTemplate } from "../sw-sections/default-template.js";
import { applySwSections, shouldIncludeBackgroundSync, generateBackgroundSyncCode } from "../sw-sections/shared.js";

export function generateSwTemplate(ctx: GeneratorContext): void {
  const { config, debug } = ctx;

  let code = getDefaultTemplate();

  code = applySwSections(code, config, true, debug);

  if (shouldIncludeBackgroundSync(config)) {
    code += generateBackgroundSyncCode(config);
  }


  writeFile(ctx, "sw/template.js", code);
}
