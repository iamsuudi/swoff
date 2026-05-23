/**
 * Generates auth-fetch.ts/js — config-driven authenticated fetch wrapper.
 * Uses auth config to generate appropriate withAuthHeaders() and isAuthUrl().
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateAuthFetch(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const authConfig = ctx.config.features.auth;
  const { loginPath, logoutPath, refreshPath, userEndpoint, type } = authConfig;

  function generateWithAuthHeaders(): string {
    switch (type) {
      case "cookie":
        return `function withAuthHeaders(headers, _auth) {
  // Cookie/Session auth — browser auto-sends cookies.
  // No header modification needed.
  return headers;
}`;
      case "bearer":
        return `function withAuthHeaders(headers, auth) {
  // --- EDIT THIS BLOCK FOR YOUR BACKEND ---
  // JWT Bearer token:
  if (auth?.token) {
    headers.set("Authorization", \`Bearer \${auth.token}\`);
  }
  // --- END OF EDITABLE BLOCK ---
  return headers;
}`;
      case "custom":
        return `function withAuthHeaders(headers, auth) {
  // --- EDIT THIS BLOCK FOR YOUR BACKEND ---
  // Custom header (e.g., X-API-Key, X-Auth-Token):
  // if (auth?.token) {
  //   headers.set("X-Auth-Token", auth.token);
  // }
  // --- END OF EDITABLE BLOCK ---
  return headers;
}`;
      default:
        return `function withAuthHeaders(headers, auth) {
  // --- EDIT THIS BLOCK FOR YOUR BACKEND ---
  if (auth?.token) {
    headers.set("Authorization", \`Bearer \${auth.token}\`);
  }
  // --- END OF EDITABLE BLOCK ---
  return headers;
}`;
    }
  }

  const credentialsLine =
    type === "cookie"
      ? `const fetchOptions = { ...options, headers, credentials: "include" };`
      : `const fetchOptions = { ...options, headers };`;

  const code = `/**
 * Auth-Aware Fetch — attaches auth headers, excludes auth endpoints from cache,
 * and handles 401 responses.
 *
 * Usage:
 *   import { authenticatedFetch } from "./auth-fetch.${ext}";
 *   const data = await authenticatedFetch("/api/data").then((r) => r.json());
 */

import { fetchWithCache } from "./fetch-wrapper.${ext}";
import { getAuth, setAuth, clearAuth } from "./auth-store.${ext}";

${generateWithAuthHeaders()}

/**
 * Auth endpoints that should never be cached by the SW.
 * Configured via swoff.config.json features.auth paths.
 */
function isAuthUrl(url) {
  const authPaths = [
    "${loginPath}",
    "${logoutPath}",
    "${refreshPath}",
    "${userEndpoint}",
  ];
  return authPaths.some((path) => url.includes(path));
}

/**
 * Auth-aware fetch wrapper.
 * Attaches identity, excludes auth endpoints from cache, handles 401.
 */
export async function authenticatedFetch(input, options = {}) {
  const auth = await getAuth();
  const headers = new Headers(options.headers);

  // Attach auth headers (your backend determines how)
  withAuthHeaders(headers, auth);

  // Determine if this is an auth endpoint (login, logout, refresh)
  const url = typeof input === "string" ? input : input.url;

  // Mark auth endpoints as mutation to bypass SW cache
  if (isAuthUrl(url) && !headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", "mutation");
  }

  ${credentialsLine}
  const response = await fetchWithCache(input, fetchOptions);

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
let refreshPromise = null;

export async function ensureValidAuth() {
  const auth = await getAuth();
  if (!auth) return null;
  if (!auth.expiresAt || Date.now() < auth.expiresAt) return auth;

  // Token expired — refresh it (deduplicated)
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

  writeFile(ctx, `auth-fetch.${ext}`, code);
}
