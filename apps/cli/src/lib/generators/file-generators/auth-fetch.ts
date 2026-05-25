/**
 * Generates auth-fetch.ts/js — thin auth wrapper around fetchWithCache.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateAuthFetch(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const authConfig = ctx.config.features.auth;
  const { refreshPath, userEndpoint, type } = authConfig;

  function generateWithAuthHeaders(): string {
    const a = T("AuthData | null");
    const h = T("Headers");
    const hd = T("Headers");
    switch (type) {
      case "cookie":
        return `function withAuthHeaders(headers${hd}, _auth${a})${h}{
  return headers;
}`;
      case "bearer":
        return `function withAuthHeaders(headers${hd}, auth${a})${h}{
  if (auth?.token) {
    headers.set("Authorization", \`Bearer \${auth.token}\`);
  }
  return headers;
}`;
      case "custom":
        return `function withAuthHeaders(headers${hd}, auth${a})${h}{
  // --- EDIT THIS BLOCK FOR YOUR BACKEND ---
  // if (auth?.token) {
  //   headers.set("X-Auth-Token", auth.token);
  // }
  // --- END OF EDITABLE BLOCK ---
  return headers;
}`;
      default:
        return `function withAuthHeaders(headers${hd}, auth${a})${h}{
  if (auth?.token) {
    headers.set("Authorization", \`Bearer \${auth.token}\`);
  }
  return headers;
}`;
    }
  }

  const credentialsLine =
    type === "cookie"
      ? `  const fetchOptions = { ...options, headers, credentials: "include" };`
      : `  const fetchOptions = { ...options, headers };`;

  const code = `/**
 * Auth-Fetch — attaches auth headers, excludes auth endpoints from cache,
 * and handles 401 responses. Thin wrapper around fetchWithCache.
 *
 * Usage:
 *   import { authenticatedFetch } from "./auth/fetch.${ext}";
 *   const data = await authenticatedFetch("/api/data").then((r) => r.json());
 *
 * Or use fetchWithCache directly:
 *   import { fetchWithCache } from "../fetch-wrapper.${ext}";
 *   const data = await fetchWithCache("/api/me", { auth: true });
 */

import { fetchWithCache } from "../fetch-wrapper.${ext}";
import { getAuth, setAuth, clearAuth${ts ? ", type AuthData" : ""} } from "./store.${ext}";

${generateWithAuthHeaders()}

/**
 * Auth endpoints that should never be cached by the SW.
 * Edit this list to match your backend's auth routes.
 */
function isAuthUrl(url${T("string")})${R("boolean")}{
  const authPaths = [
    "/login",
    "/logout",
    "/register",
    "/api/login",
    "/api/logout",
    "/api/register",
    "${refreshPath}",
    "${userEndpoint}",
  ];
  return authPaths.some((path) => url.includes(path));
}

/** Auth-aware fetch. Delegates to fetchWithCache with auth headers, cache bypass for auth endpoints, and 401 handling. */
export async function authenticatedFetch(input${T("RequestInfo")}, options${T("RequestInit")} = {})${R("Promise<Response>")}{
  const auth = await getAuth();
  const headers = new Headers(options.headers);

  withAuthHeaders(headers, auth);

  const url = typeof input === "string" ? input : input.url;

  // Mark auth endpoints as mutation to bypass SW cache
  if (isAuthUrl(url) && !headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", "mutation");
  }

  ${credentialsLine}
  const { response } = await fetchWithCache(input, fetchOptions);

  // Handle 401 — auth expired or invalidated server-side
  if (response.status === 401) {
    await clearAuth();
    window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
  }

  return response;
}

/**
 * Token refresh helper — called before requests when token may be expired.
 * Uses refreshPath from config.
 */
let refreshPromise${T("Promise<AuthData | null> | null")} = null;

export async function ensureValidAuth()${R("Promise<AuthData | null>")}{
  const auth = await getAuth();
  if (!auth) return null;
  if (!auth.expiresAt || Date.now() < auth.expiresAt) return auth;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await authenticatedFetch("${refreshPath}", {
        method: "POST",
        headers: { "X-SW-Cache-Strategy": "mutation" },
      });

      if (!response.ok) {
        await clearAuth();
        window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
        return null;
      }

      const data = await response.json();
      const updated = { ...auth, token: data.token, expiresAt: data.expiresAt };
      await setAuth(updated);
      return updated;
    })();
  }

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}
`;

  writeFile(ctx, `auth/fetch.${ext}`, code);
}
