import { GeneratorContext, writeFile } from "./context.js";
import { generateFetchStateCode } from "../../../runtime/fetch-state.js";

export function generateFetchState(ctx: GeneratorContext): void {
  writeFile(ctx, `fetch/state.${ctx.ext}`, generateFetchStateCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
