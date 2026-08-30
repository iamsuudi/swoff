/**
 * Generates auth-store.ts/js — token storage, auth headers, auth URL detection,
 * and token refresh. All auth logic lives here so fetch-wrapper can import it
 * without circular dependencies.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateAuthStoreCode } from "../../../runtime/auth-store.js";

export function generateAuthStore(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const authConfig = ctx.config.features.auth;
  const caching = ctx.config.features.caching;

  const code = generateAuthStoreCode(
    { ts, ext },
    authConfig.type,
    authConfig.routePaths,
    caching.mutationQueue.enabled,
    caching.enabled,
  );

  writeFile(ctx, `auth/store.${ext}`, code);
}
