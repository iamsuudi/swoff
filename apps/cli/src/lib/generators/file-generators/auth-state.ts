/**
 * Generates auth-state.ts/js — auth state detection for the 4-state matrix.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateAuthStateCode } from "../../../runtime/auth-state.js";

export function generateAuthState(ctx: GeneratorContext): void {
  writeFile(ctx, `auth/state.${ctx.ext}`, generateAuthStateCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
