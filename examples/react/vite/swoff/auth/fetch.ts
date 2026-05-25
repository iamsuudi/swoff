/**
 * Auth-Fetch — attaches auth headers, excludes auth endpoints from cache,
 * and handles 401 responses. Thin wrapper around fetchWithCache.
 *
 * Usage:
 *   import { authenticatedFetch } from "./auth/fetch.ts";
 *   const data = await authenticatedFetch("/api/data").then((r) => r.json());
 *
 * Or use fetchWithCache directly:
 *   import { fetchWithCache } from "../fetch-wrapper.ts";
 *   const data = await fetchWithCache("/api/me", { auth: true });
 */

import { fetchWithCache } from "../fetch-wrapper.ts";
import { getAuth, setAuth, clearAuth, type AuthData } from "./store.ts";

function withAuthHeaders(headers: Headers, auth: AuthData | null): Headers{
  if (auth?.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  return headers;
}

/**
 * Auth endpoints that should never be cached by the SW.
 * Edit this list to match your backend's auth routes.
 */
function isAuthUrl(url: string): boolean {
  const authPaths = [
    "/login",
    "/logout",
    "/register",
    "/api/login",
    "/api/logout",
    "/api/register",
    "/api/refresh",
    "/api/me",
  ];
  return authPaths.some((path) => url.includes(path));
}

/** Auth-aware fetch. Delegates to fetchWithCache with auth headers, cache bypass for auth endpoints, and 401 handling. */
export async function authenticatedFetch(input: RequestInfo, options: RequestInit = {}): Promise<Response> {
  const auth = await getAuth();
  const headers = new Headers(options.headers);

  withAuthHeaders(headers, auth);

  const url = typeof input === "string" ? input : input.url;

  // Mark auth endpoints as mutation to bypass SW cache
  if (isAuthUrl(url) && !headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", "mutation");
  }

    const fetchOptions = { ...options, headers };
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
let refreshPromise: Promise<AuthData | null> | null = null;

export async function ensureValidAuth(): Promise<AuthData | null> {
  const auth = await getAuth();
  if (!auth) return null;
  if (!auth.expiresAt || Date.now() < auth.expiresAt) return auth;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await authenticatedFetch("/api/refresh", {
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
