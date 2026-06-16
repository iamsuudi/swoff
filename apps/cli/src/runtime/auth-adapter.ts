import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

function generateCookieAdapter(ts: boolean, ext: string): string {
  return `/**
 * Auth Adapter — maps Swoff auth infrastructure to your auth provider.
 *
 * Cookie (session) auth: the server manages sessions via an httpOnly cookie.
 * The browser auto-sends the cookie on every same-origin request, so
 * no header injection is needed.
 *
 * Edit the URLs below if your backend uses different endpoints.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.${ext}";
 *   const headers = adapter.getHeaders(auth);
 */${ts ? `
// ─── AuthData — single source of truth for auth shapes ───────────────
// Edit the user type to match your backend's user object.
export interface AuthData {
  token?: string;
  user?: unknown;
  expiresAt?: number;
}
` : ""}
import { isAuthFailureResponse } from "./check.${ext}";

export const adapter${T(ts, "{ type: 'cookie'; getAuth: () => Promise<AuthData | null>; getHeaders: (auth: AuthData | null) => Record<string, string>; refresh: (auth: AuthData) => Promise<AuthData | null>; fetchUser: () => Promise<AuthData | null> }")}= {
  type: "cookie",

  /** Get current auth state from your provider. Return null if not authenticated. */
  async getAuth()${R(ts, "Promise<AuthData | null>")}{
    return null;
  },

  /** Generate auth headers for fetch requests. Cookie auth returns empty — browser sends cookie. */
  getHeaders(_auth${T(ts, "AuthData | null")})${R(ts, "Record<string, string>")}{
    return {};
  },

  /** Refresh the session. Cookie auth: server manages session, return null to skip. */
  async refresh(_auth${T(ts, "AuthData")})${R(ts, "Promise<AuthData | null>")}{
    return null;
  },

  /** Fetch current user from the server. Uses credentials: include for cookie auth. */
  async fetchUser()${R(ts, "Promise<AuthData | null>")}{
    const res = await fetch("/api/me", { credentials: "include" });
    if (await isAuthFailureResponse(res)) return null;
    return { user: await res.json() };
  },
};
`;
}

function generateBearerAdapter(ts: boolean, ext: string): string {
  return `/**
 * Auth Adapter — maps Swoff auth infrastructure to your auth provider.
 *
 * Bearer token auth: the server returns a token on login. The client stores it
 * in memory and sends it as \`Authorization: Bearer <token>\` on every request.
 *
 * Edit the URLs below if your backend uses different endpoints.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.${ext}";
 *   const headers = adapter.getHeaders(auth);
 *   const refreshed = await adapter.refresh(auth);
 */${ts ? `
// ─── AuthData — single source of truth for auth shapes ───────────────
// Edit the user type to match your backend's user object.
export interface AuthData {
  token?: string;
  user?: unknown;
  expiresAt?: number;
}
` : ""}
import { getAuth } from "./store.${ext}";
import { isAuthFailureResponse } from "./check.${ext}";

export const adapter${T(ts, "{ type: 'bearer'; getAuth: () => Promise<AuthData | null>; getHeaders: (auth: AuthData | null) => Record<string, string>; refresh: (auth: AuthData) => Promise<AuthData | null>; fetchUser: () => Promise<AuthData | null> }")}= {
  type: "bearer",

  /** Get current auth state from your provider. Return null if not authenticated. */
  async getAuth()${R(ts, "Promise<AuthData | null>")}{
    return null;
  },

  /** Generate auth headers. Injects Bearer token if available. */
  getHeaders(auth${T(ts, "AuthData | null")})${R(ts, "Record<string, string>")}{
    return auth?.token ? { Authorization: \`Bearer \${auth.token}\` } : {};
  },

  /** Refresh the session. Sends the existing token to /api/refresh. */
  async refresh(auth${T(ts, "AuthData")})${R(ts, "Promise<AuthData | null>")}{
    try {
      const headers${T(ts, "Record<string, string>")} = { "Content-Type": "application/json" };
      if (auth.token) headers["Authorization"] = \`Bearer \${auth.token}\`;
      const res = await fetch("/api/refresh", { method: "POST", headers });
      if (await isAuthFailureResponse(res)) return null;
      const data = await res.json();
      return { ...auth, token: data.token, expiresAt: data.expiresAt };
    } catch { return null; }
  },

  /** Fetch current user from the server. Injects Bearer token if available. */
  async fetchUser()${R(ts, "Promise<AuthData | null>")}{
    const auth = await getAuth();
    const headers${T(ts, "Record<string, string>")} = {};
    if (auth?.token) headers["Authorization"] = \`Bearer \${auth.token}\`;
    const res = await fetch("/api/me", { headers });
    if (await isAuthFailureResponse(res)) return null;
    return { user: await res.json() };
  },
};
`;
}

function generateCustomAdapter(ts: boolean, ext: string): string {
  return `/**
 * Auth Adapter — maps Swoff auth infrastructure to your auth provider.
 *
 * EDIT THIS FILE to match your backend's auth flow.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.${ext}";
 *   const headers = adapter.getHeaders(auth);
 */${ts ? `
// ─── AuthData — single source of truth for auth shapes ───────────────
// Edit all fields to match your backend's auth shapes.
export interface AuthData {
  token?: string;
  user?: unknown;
  expiresAt?: number;
}
` : ""}
import { isAuthFailureResponse } from "./check.${ext}";

export const adapter = {
  /** Set to "cookie" if your backend uses httpOnly cookies, "bearer" if it uses tokens. */
  type: "bearer",

  /** Get current auth state. Implement if your provider has a getSession() equivalent. */
  async getAuth() { return null; },

  /** Generate auth headers for fetch requests. */
  getHeaders(auth) {
    // --- EDIT THIS ---
    if (auth?.token) return { Authorization: \`Bearer \${auth.token}\` };
    return {};
  },

  /** Refresh the session. Return null if refresh fails. Use isAuthFailureResponse to validate. */
  async refresh(auth) {
    // --- EDIT THIS ---
    try {
      const headers = { "Content-Type": "application/json" };
      if (auth?.token) headers["Authorization"] = \`Bearer \${auth.token}\`;
      const res = await fetch("/api/refresh", { method: "POST", headers });
      if (await isAuthFailureResponse(res)) return null;
      const data = await res.json();
      return { ...auth, token: data.token, expiresAt: data.expiresAt };
    } catch { return null; }
  },

  /** Fetch current user. Return AuthData | null (e.g. { user: data }). Use isAuthFailureResponse to validate. */
  async fetchUser() {
    // --- EDIT THIS ---
    return null;
  },
};
`;
}

const ADAPTER_GENERATORS: Record<string, (ts: boolean, ext: string) => string> = {
  "cookie": generateCookieAdapter,
  "bearer": generateBearerAdapter,
  "custom": generateCustomAdapter,
};

export function generateAuthAdapterCode(
  ctx: RuntimeContext,
  authType: string,
): string {
  const generator = ADAPTER_GENERATORS[authType] || ADAPTER_GENERATORS["custom"];
  return generator(ctx.ts, ctx.ext);
}
