/**
 * Generates auth/adapter.ts/js — maps Swoff auth infrastructure to the user's auth provider.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateAuthAdapterCode } from "../../../runtime/auth-adapter.js";

export function generateAuthAdapter(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const authConfig = ctx.config.features.auth;

  const code = generateAuthAdapterCode(
    { ts, ext },
    authConfig.type,
  );

  writeFile(ctx, `auth/adapter.${ext}`, code);
}
