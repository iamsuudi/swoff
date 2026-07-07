import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { defaultConfig, type SwoffConfig } from "../lib/shared/config-types.js";
import type { GeneratorContext } from "../lib/generators/file-generators/context.js";

import { generateAuthStore } from "../lib/generators/file-generators/auth-store.js";
import { generateAuthState } from "../lib/generators/file-generators/auth-state.js";
import { generateFetchHandler } from "../lib/generators/sw-sections/fetch-handler.js";
import { generateClientInjector } from "../lib/generators/file-generators/client-injector.js";

const testDir = "/tmp/swoff-test-auth-templates";

function makeContext(overrides?: Partial<SwoffConfig>): GeneratorContext {
  const config: SwoffConfig = {
    ...defaultConfig,
    ...overrides,
    features: {
      ...defaultConfig.features,
      ...overrides?.features,
      pwa: { ...defaultConfig.features.pwa, ...overrides?.features?.pwa },
      serviceWorker: {
        ...defaultConfig.features.serviceWorker,
        ...overrides?.features?.serviceWorker,
      },
    },
    build: { ...defaultConfig.build, ...overrides?.build },
  };

  return {
    config,
    projectRoot: testDir,
    swoffDir: join(testDir, "swoff"),
    ext: "js",
    generatedFiles: [],
    frameworkName: "no-bundler",
    hasBundler: false,
  };
}

beforeEach(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true });
});

// ── Helpers ─────────────────────────────────────────────

function authConfig(type: string, routePaths?: string[]) {
  return {
    enabled: true,
    type,
    routePaths: routePaths ?? defaultConfig.features.auth.routePaths,
  };
}

describe("auth-store", () => {
  it("clearAuth broadcasts AUTH_CLEARED to SW", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie") } });
    generateAuthStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "auth", "store.js"), "utf8");
    expect(content).toContain('navigator.serviceWorker.controller?.postMessage({ type: "AUTH_CLEARED" })');
    expect(content).toContain("clearAuth");
  });

  it("clearAuth does not broadcast when broadcast=false", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie") } });
    generateAuthStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "auth", "store.js"), "utf8");
    expect(content).toContain("options.broadcast !== false");
  });

  it("clearMemoryAuth is exported and nulls memoryAuth", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie") } });
    generateAuthStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "auth", "store.js"), "utf8");
    expect(content).toContain("export function clearMemoryAuth");
    expect(content).toContain("memoryAuth = null");
  });

  it("isAuthUrl uses routePaths from config", () => {
    const customPaths = ["/login", "/logout", "/custom/api/auth"];
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie", customPaths) } });
    generateAuthStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "auth", "store.js"), "utf8");
    expect(content).toContain(JSON.stringify(customPaths));
    expect(content).toContain("export function isAuthUrl");
    expect(content).not.toContain('"/api/refresh"');
  });

  it("cookie auth: ensureValidAuth is a simple getAuth()", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie") } });
    generateAuthStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "auth", "store.js"), "utf8");
    expect(content).not.toContain("tryRestoreSession");
    expect(content).not.toContain("refreshPromise");
  });

  it("bearer auth: ensureValidAuth has restore and refresh logic", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("bearer") } });
    generateAuthStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "auth", "store.js"), "utf8");
    expect(content).toContain("tryRestoreSession");
    expect(content).toContain("refreshPromise");
  });
});

describe("auth-state", () => {
  it("uses connectivity for online status", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie") } });
    generateAuthState(ctx);
    const content = readFileSync(join(ctx.swoffDir, "auth", "state.js"), "utf8");
    expect(content).toContain("getCurrentOnlineStatus");
    expect(content).toContain("../connectivity");
  });
});

describe("fetch-handler", () => {
  const baseSwConfig = {
    strategy: { ...defaultConfig.features.serviceWorker.strategy },
    navigation: { ...defaultConfig.features.serviceWorker.navigation },
    refetchQueue: { ...defaultConfig.features.refetchQueue },
  };

  it("generates AUTH_ROUTES constant with config paths", () => {
    const code = generateFetchHandler(baseSwConfig, true, false, ["/login", "/api/login", "/api/me"], false);
    expect(code).toContain('const AUTH_ROUTES = ["/login","/api/login","/api/me"]');
  });

  it("adds auth-route-bypass early return in fetch listener", () => {
    const code = generateFetchHandler(baseSwConfig, true, false, ["/api/me"], false);
    expect(code).toContain("auth-route-bypass");
    expect(code).toContain("AUTH_ROUTES.some");
  });

  it("omits AUTH_ROUTES when routePaths is empty", () => {
    const code = generateFetchHandler(baseSwConfig, true, false, [], false);
    expect(code).not.toContain("AUTH_ROUTES");
    expect(code).not.toContain("auth-route-bypass");
  });

  it("checkAuthFailure calls isAuthFailureResponse", () => {
    const code = generateFetchHandler(baseSwConfig, true, false, ["/api/me"], false);
    expect(code).toContain("isAuthFailureResponse(response)");
    expect(code).not.toContain("function isAuthFailureResponse");
  });

  it("checkAuthFailure awaits isAuthFailureResponse", () => {
    const code = generateFetchHandler(baseSwConfig, true, false, ["/api/me"], false);
    expect(code).toContain("isAuthFailureResponse(response)");
  });
});

describe("client-injector", () => {
  it("handles AUTH_CLEARED message from SW when auth enabled", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie") } });
    generateClientInjector(ctx);
    const content = readFileSync(join(ctx.swoffDir, "client-injector.js"), "utf8");
    expect(content).toContain("AUTH_CLEARED");
    expect(content).toContain("clearMemoryAuth");
    expect(content).toContain("clearMemoryAuth()");
  });

  it("imports clearMemoryAuth from auth store", () => {
    const ctx = makeContext({ features: { ...defaultConfig.features, auth: authConfig("cookie") } });
    generateClientInjector(ctx);
    const content = readFileSync(join(ctx.swoffDir, "client-injector.js"), "utf8");
    expect(content).toContain('clearMemoryAuth');
  });
});
