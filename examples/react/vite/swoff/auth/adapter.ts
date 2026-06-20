/**
 * Auth Adapter — maps Swoff auth infrastructure to your auth provider.
 *
 * Cookie (session) auth: the server manages sessions via an httpOnly cookie.
 * The browser auto-sends the cookie on every same-origin request, so
 * no header injection is needed.
 *
 * Edit the URLs below if your backend uses different endpoints.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.ts";
 *   const headers = adapter.getHeaders(auth);
 */
// ─── AuthData — single source of truth for auth shapes ───────────────
// Edit the user type to match your backend's user object.
export interface AuthData {
  token?: string;
  user?: unknown;
  expiresAt?: number;
}


export const adapter: { type: 'cookie'; getAuth: () => Promise<AuthData | null>; getHeaders: (auth: AuthData | null) => Record<string, string>; refresh: (auth: AuthData) => Promise<AuthData | null>; fetchUser: () => Promise<AuthData | null> }= {
  type: "cookie",

  /** Get current auth state from your provider. Return null if not authenticated. */
  async getAuth(): Promise<AuthData | null> {
    return null;
  },

  /** Generate auth headers for fetch requests. Cookie auth returns empty — browser sends cookie. */
  getHeaders(_auth: AuthData | null): Record<string, string> {
    return {};
  },

  /** Refresh the session. Cookie auth: server manages session, return null. */
  async refresh(_auth: AuthData): Promise<AuthData | null> {
    return null;
  },

  /** Fetch current user from the server. Uses credentials: include for cookie auth. */
  async fetchUser(): Promise<AuthData | null> {
    const res = await fetch("/api/me", { credentials: "include" });
    return res.ok ? { user: await res.json() } : null;
  },
};
