import { GeneratorContext, writeFile } from "./context.js";
import { generateApiConfigCode } from "../../../runtime/api-config.js";

export function generateApiConfig(ctx: GeneratorContext): void {
  writeFile(ctx, `config.${ctx.ext}`, generateApiConfigCode());
}
