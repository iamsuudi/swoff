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
 *   adapter.subscribe((authData) => { ... });
 *   const headers = adapter.getHeaders(auth);
 */

import type { AuthData } from "./store.${ext}";

export const adapter${T(ts, "{ type: 'cookie'; toAuthData: (response: unknown) => AuthData; getAuth: () => Promise<AuthData | null>; subscribe: (onChange: (authData: AuthData | null) => void) => () => void; getHeaders: (auth: AuthData | null) => Record<string, string>; refresh: (auth: AuthData) => Promise<AuthData | null>; fetchUser: () => Promise<Record<string, unknown>> }")}= {
  type: "cookie",

  /** Map your backend login/register response to Swoff AuthData. */
  toAuthData(response${T(ts, "unknown")})${R(ts, "AuthData")}{
    const data = response as Record<string, unknown>;
    return {
      user: data.user as Record<string, unknown> | undefined,
    };
  },

  /** Get current auth state from your provider. Return null if not authenticated. */
  async getAuth()${R(ts, "Promise<AuthData | null>")}{
    return null;
  },

  /** Subscribe to auth state changes from your provider. Return unsubscribe. */
  subscribe(_onChange${T(ts, "(authData: AuthData | null) => void")})${R(ts, "() => void")}{
    return () => {};
  },

  /** Generate auth headers for fetch requests. Cookie auth returns empty — browser sends cookie. */
  getHeaders(_auth${T(ts, "AuthData | null")})${R(ts, "Record<string, string>")}{
    return {};
  },

  /** Refresh the session. Cookie auth: server manages session, return null. */
  async refresh(_auth${T(ts, "AuthData")})${R(ts, "Promise<AuthData | null>")}{
    return null;
  },

  /** Fetch current user from the server. Uses credentials: include for cookie auth. */
  async fetchUser()${R(ts, "Promise<Record<string, unknown>>")}{
    const res = await fetch("/api/me", { credentials: "include" });
    return res.ok ? res.json() : {};
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
 */

import type { AuthData } from "./store.${ext}";

export const adapter${T(ts, "{ type: 'bearer'; toAuthData: (response: unknown) => AuthData; getAuth: () => Promise<AuthData | null>; subscribe: (onChange: (authData: AuthData | null) => void) => () => void; getHeaders: (auth: AuthData | null) => Record<string, string>; refresh: (auth: AuthData) => Promise<AuthData | null>; fetchUser: () => Promise<Record<string, unknown>> }")}= {
  type: "bearer",

  /** Map your backend login/register response to Swoff AuthData. */
  toAuthData(response${T(ts, "unknown")})${R(ts, "AuthData")}{
    const data = response as Record<string, unknown>;
    return {
      token: data.token as string,
      user: data.user as Record<string, unknown> | undefined,
      expiresAt: data.expiresAt as number | undefined,
    };
  },

  /** Get current auth state from your provider. Return null if not authenticated. */
  async getAuth()${R(ts, "Promise<AuthData | null>")}{
    return null;
  },

  /** Subscribe to auth state changes from your provider. Return unsubscribe. */
  subscribe(onChange${T(ts, "(authData: AuthData | null) => void")})${R(ts, "() => void")}{
    return () => {};
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
      if (!res.ok) return null;
      const data = await res.json();
      return { ...auth, token: data.token, expiresAt: data.expiresAt };
    } catch { return null; }
  },

  /** Fetch current user from the server. Injects Bearer token if available. */
  async fetchUser()${R(ts, "Promise<Record<string, unknown>>")}{
    const auth = await getAuth();
    const headers${T(ts, "Record<string, string>")} = {};
    if (auth?.token) headers["Authorization"] = \`Bearer \${auth.token}\`;
    const res = await fetch("/api/me", { headers });
    return res.ok ? res.json() : {};
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
 *   adapter.subscribe((authData) => { ... });
 *   const headers = adapter.getHeaders(auth);
 */${ts ? `
import type { AuthData } from "./store.${ext}";` : ""}

export const adapter = {
  /** Set to "cookie" if your backend uses httpOnly cookies, "bearer" if it uses tokens. */
  type: "bearer",

  /** Map your backend login/register response to Swoff AuthData. */
  toAuthData(response) {
    // --- EDIT THIS ---
    return {
      token: response.token,
      user: response.user,
      expiresAt: response.expiresAt,
    };
  },

  /** Get current auth state. Implement if your provider has a getSession() equivalent. */
  async getAuth() { return null; },

  /** Subscribe to auth state changes. Implement for reactive updates. */
  subscribe(onChange) { return () => {}; },

  /** Generate auth headers for fetch requests. */
  getHeaders(auth) {
    // --- EDIT THIS ---
    if (auth?.token) return { Authorization: \`Bearer \${auth.token}\` };
    return {};
  },

  /** Refresh the session. Return null if refresh fails. */
  async refresh(auth) {
    // --- EDIT THIS ---
    try {
      const headers = { "Content-Type": "application/json" };
      if (auth?.token) headers["Authorization"] = \`Bearer \${auth.token}\`;
      const res = await fetch("/api/refresh", { method: "POST", headers });
      if (!res.ok) return null;
      const data = await res.json();
      return { ...auth, token: data.token, expiresAt: data.expiresAt };
    } catch { return null; }
  },

  /** Fetch current user. */
  async fetchUser() {
    // --- EDIT THIS ---
    return {};
  },
};
`;
}

function generateBetterAuthAdapter(ts: boolean, ext: string): string {
  return `/**
 * Auth Adapter — Better Auth integration.
 *
 * Edit the import path below to match your auth client location.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.${ext}";
 *   adapter.subscribe((authData) => { ... });
 *   const session = await adapter.getAuth();
 */

import type { AuthData } from "./store.${ext}";
import { authClient } from "@/lib/auth-client";

export const adapter = {
  type: "cookie",

  toAuthData(response) {
    return { user: response?.user ?? response };
  },

  async getAuth() {
    try {
      const session = await authClient.getSession();
      return session ? { user: session.user } : null;
    } catch { return null; }
  },

  subscribe(onChange) {
    return authClient.$store.listen((session) => {
      onChange(session ? { user: session.user } : null);
    });
  },

  getHeaders() { return {}; },

  async refresh() {
    try {
      const session = await authClient.getSession();
      return session ? { user: session.user } : null;
    } catch { return null; }
  },

  async fetchUser() {
    try {
      const session = await authClient.getSession();
      return session?.user ?? {};
    } catch { return {}; }
  },
};
`;
}

function generateNextAuthAdapter(ts: boolean, ext: string): string {
  return `/**
 * Auth Adapter — NextAuth.js (Auth.js) integration.
 *
 * Edit the import path below to match your auth library location.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.${ext}";
 *   const session = await adapter.getAuth();
 */

import type { AuthData } from "./store.${ext}";
import { getSession, signOut } from "next-auth/react";

export const adapter = {
  type: "cookie",

  toAuthData(response) {
    return { user: response?.user ?? response };
  },

  async getAuth() {
    try {
      const session = await getSession();
      return session ? { user: session.user } : null;
    } catch { return null; }
  },

  subscribe(onChange) {
    // NextAuth doesn't export a reactive store subscription.
    // Poll every 30s or call refreshState() after signIn/signOut manually.
    const interval = setInterval(async () => {
      const session = await getSession();
      onChange(session ? { user: session.user } : null);
    }, 30000);
    return () => clearInterval(interval);
  },

  getHeaders() { return {}; },

  async refresh() {
    try {
      const session = await getSession();
      return session ? { user: session.user } : null;
    } catch { return null; }
  },

  async fetchUser() {
    try {
      const session = await getSession();
      return session?.user ?? {};
    } catch { return {}; }
  },
};
`;
}

function generateClerkAdapter(ts: boolean, ext: string): string {
  return `/**
 * Auth Adapter — Clerk integration.
 *
 * Edit the import path below to match your Clerk setup.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.${ext}";
 *   const user = await adapter.getAuth();
 */

import type { AuthData } from "./store.${ext}";
import { useAuth } from "@clerk/nextjs";

export const adapter = {
  type: "cookie",

  toAuthData(response) {
    return { user: response?.user ?? response };
  },

  async getAuth() {
    return null;
  },

  subscribe(onChange) {
    // Clerk's useAuth() is a React hook and cannot be used outside components.
    // Use Clerk's useSession() or <SignedIn>/<SignedOut> for reactive UI.
    // This interval polls as a fallback.
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = res.ok ? await res.json() : null;
        onChange(session ? { user: session.user } : null);
      } catch { /* offline */ }
    }, 60000);
    return () => clearInterval(interval);
  },

  getHeaders() { return {}; },

  async refresh() { return null; },

  async fetchUser() {
    try {
      const res = await fetch("/api/auth/session");
      const session = res.ok ? await res.json() : null;
      return session?.user ?? {};
    } catch { return {}; }
  },
};
`;
}

function generateSupabaseAdapter(ts: boolean, ext: string): string {
  return `/**
 * Auth Adapter — Supabase integration.
 *
 * Edit the import path below to match your Supabase client location.
 *
 * Usage:
 *   import { adapter } from "./auth/adapter.${ext}";
 *   const session = await adapter.getAuth();
 */

import type { AuthData } from "./store.${ext}";
import { supabase } from "@/lib/supabase";

export const adapter = {
  type: "bearer",

  toAuthData(response) {
    const session = response?.session ?? response;
    return {
      token: session?.access_token,
      user: session?.user,
      expiresAt: session?.expires_at ? session.expires_at * 1000 : undefined,
    };
  },

  async getAuth() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      return {
        token: data.session.access_token,
        user: data.session.user,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : undefined,
      };
    } catch { return null; }
  },

  subscribe(onChange) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        onChange({
          token: session.access_token,
          user: session.user,
          expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
        });
      } else {
        onChange(null);
      }
    });
    return () => subscription.unsubscribe();
  },

  getHeaders(auth) {
    return auth?.token ? { Authorization: \`Bearer \${auth.token}\` } : {};
  },

  async refresh(auth) {
    try {
      const { data } = await supabase.auth.refreshSession();
      if (!data.session) return null;
      return {
        token: data.session.access_token,
        user: data.session.user,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : undefined,
      };
    } catch { return null; }
  },

  async fetchUser() {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.user ?? {};
    } catch { return {}; }
  },
};
`;
}

const ADAPTER_GENERATORS: Record<string, (ts: boolean, ext: string) => string> = {
  "cookie": generateCookieAdapter,
  "bearer": generateBearerAdapter,
  "custom": generateCustomAdapter,
  "better-auth": generateBetterAuthAdapter,
  "next-auth": generateNextAuthAdapter,
  "clerk": generateClerkAdapter,
  "supabase": generateSupabaseAdapter,
};

export function generateAuthAdapterCode(
  ctx: RuntimeContext,
  authType: string,
): string {
  const generator = ADAPTER_GENERATORS[authType] || ADAPTER_GENERATORS["custom"];
  return generator(ctx.ts, ctx.ext);
}
