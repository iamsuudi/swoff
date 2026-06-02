/**
 * Generates swoff.d.ts - TypeScript type declarations.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateTypeDefinitionsCode } from "../../../runtime/type-definitions.js";

export function generateTypeDefinitions(ctx: GeneratorContext): void {
  if (ctx.ext !== "ts") return;
  writeFile(ctx, "swoff.d.ts", generateTypeDefinitionsCode());
}
