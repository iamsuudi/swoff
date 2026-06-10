/**
 * Generates sw-template.js - the SW template with config features baked in.
 * Placeholders are replaced during build by sw-generator.js.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { getDefaultTemplate } from "../sw-sections/default-template.js";
import { applySwSections, shouldIncludeBackgroundSync, generateBackgroundSyncCode } from "../sw-sections/shared.js";

export function generateSwTemplate(ctx: GeneratorContext): void {
  const { config } = ctx;

  let code = getDefaultTemplate();
  code = `// [[HEADER]]\n\n${code}`;

  code = code.replace("// [[CACHE_NAME]]", "// [[CACHE_NAME]]");
  code = code.replace("// [[ASSETS_LIST]]", "// [[ASSETS_LIST]]");
  code = code.replace("// [[AUTO_SKIP_WAITING]]", "// [[AUTO_SKIP_WAITING]]");

  code = applySwSections(code, config, true);

  if (shouldIncludeBackgroundSync(config)) {
    code += generateBackgroundSyncCode(config);
  }

  code += `\n// Dev mode fallback\nif (!CACHE_NAME) CACHE_NAME = "sw-dev-cache";\n`;

  writeFile(ctx, "sw/template.js", code);
}
