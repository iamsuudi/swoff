/**
 * Generates auth-user.ts/js — fetch, cache, and invalidate current user.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateAuthUserCode } from "../../../runtime/auth-user.js";

export function generateAuthUser(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const authConfig = ctx.config.features.auth;

  const code = generateAuthUserCode(
    { ts, ext },
    authConfig.refreshPath,
    authConfig.userEndpoint,
    authConfig.type,
  );

  writeFile(ctx, `auth/user.${ext}`, code);
}
