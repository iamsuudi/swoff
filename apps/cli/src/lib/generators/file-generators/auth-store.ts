/**
 * Generates auth-store.ts/js — token storage, auth headers, auth URL detection,
 * and token refresh. All auth logic lives here so fetch-wrapper can import it
 * without circular dependencies.
 *
 * Security: the Bearer token lives in memory only and is cleared on page
 * refresh. Only { user, expiresAt } is persisted to IndexedDB for offline
 * user display. After a page refresh, re-login is required.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateAuthStoreCode } from "../../../runtime/auth-store.js";

export function generateAuthStore(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const authConfig = ctx.config.features.auth;

  const code = generateAuthStoreCode(
    { ts, ext },
    authConfig.type,
    authConfig.refreshPath,
    authConfig.userEndpoint,
  );

  writeFile(ctx, `auth/store.${ext}`, code);
}
