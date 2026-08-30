import { describe, it, expect } from "vitest";
import {
  buildMinimalConfig,
  type WizardAnswers,
} from "../lib/config/minimal-config.js";

const baseAnswers: WizardAnswers = {
  framework: "react",
  swOutput: "dist",
  autoActivate: false,
  navMode: "spa",
  fallback: "/offline",
  defaultStrategy: "cache-first",
  pwaEnabled: false,
  authEnabled: false,
  connectivityEnabled: false,
  cachingEnabled: false,
  mutationEnabled: false,
  tagInvalidationEnabled: false,
  graphqlEnabled: false,
  serverPushEnabled: false,
  pushNotificationsEnabled: false,
};

const cachingFeature = (config: Record<string, unknown>) =>
  (config.features as Record<string, unknown>).caching as Record<
    string,
    unknown
  >;

describe("buildMinimalConfig", () => {
  it("produces config with only serviceWorker when no options enabled", () => {
    const config = buildMinimalConfig(baseAnswers);
    expect(config.framework).toBe("react");
    expect(config.features).toHaveProperty("serviceWorker");
    expect((config.features as Record<string, unknown>).serviceWorker).toEqual({
      autoActivate: false,
    });
    expect(config.features).not.toHaveProperty("connectivity");
    expect(config.features).not.toHaveProperty("pwa");
    expect(config.features).not.toHaveProperty("auth");
    expect(config.features).not.toHaveProperty("caching");
    expect(config.features).not.toHaveProperty("pushNotifications");
    expect(config.build).not.toHaveProperty("precacheDirs");
  });

  it("emits serviceWorker.autoActivate from answers", () => {
    const config = buildMinimalConfig({ ...baseAnswers, autoActivate: true });
    expect((config.features as Record<string, unknown>).serviceWorker).toEqual({
      autoActivate: true,
    });
  });

  it("includes connectivity block with defaults when enabled", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      connectivityEnabled: true,
    });
    expect(config.features).toHaveProperty("connectivity");
    expect((config.features as Record<string, unknown>).connectivity).toEqual({
      enabled: true,
      heartbeatIntervalMs: 30000,
    });
  });

  it("includes pwa block with all child fields when enabled", () => {
    const config = buildMinimalConfig({ ...baseAnswers, pwaEnabled: true });
    expect(config.features).toHaveProperty("pwa");
    expect((config.features as Record<string, unknown>).pwa).toEqual({
      enabled: true,
      preventDefaultInstall: false,
    });
  });

  it("includes auth block with type and default routePaths when authEnabled", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      authEnabled: true,
      authType: "bearer",
    });
    const auth = (config.features as Record<string, unknown>)
      .auth as Record<string, unknown>;
    expect(auth).toEqual(
      expect.objectContaining({ enabled: true, type: "bearer" }),
    );
    expect(Array.isArray(auth.routePaths)).toBe(true);
    expect(auth.routePaths).toContain("/login");
  });

  it("emits the caching umbrella when any caching feature is selected", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      mutationEnabled: true,
    });
    const caching = cachingFeature(config);
    expect(caching.enabled).toBe(true);
    expect((caching.strategy as Record<string, unknown>).default).toBe(
      "cache-first",
    );
    expect(caching.mutationQueue).toEqual(
      expect.objectContaining({ enabled: true }),
    );
    expect(caching).not.toHaveProperty("tagInvalidation");
    expect(caching).not.toHaveProperty("graphql");
    expect(caching).not.toHaveProperty("serverPush");
  });

  it("does not emit caching when sub-feature flags are set but caching gate is off", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      mutationEnabled: true,
      graphqlEnabled: true,
    });
    expect(config.features).not.toHaveProperty("caching");
  });

  it("fills all caching descendants with defaults, booleans included", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      mutationEnabled: true,
    });
    const caching = cachingFeature(config);
    const strategy = caching.strategy as Record<string, unknown>;
    const navigation = caching.navigation as Record<string, unknown>;
    expect(strategy.maxRuntimeCacheAge).toBe(2592000);
    expect(strategy.timeout).toBe(10);
    expect(strategy.storageThreshold).toBe(80);
    expect(strategy).toHaveProperty("normalizeKey", false);
    expect(strategy).toHaveProperty("ignoreQueryParams", []);
    expect(strategy).not.toHaveProperty("reactive");
    expect(navigation).toEqual(
      expect.objectContaining({ mode: "spa", fallback: "/offline" }),
    );
    expect(navigation).toHaveProperty("preload", true);
    expect(navigation.precacheRoutes).toEqual([]);
    expect(navigation.rules).toEqual([]);
    expect(caching).toHaveProperty("requestBatchWindowMs", 50);
    expect(caching.precache).toEqual({ concurrency: 1 });
    expect(caching.refetchQueue).toEqual(
      expect.objectContaining({ batchSize: 5, batchDelayMs: 1000 }),
    );
  });

  it("includes strategy.reactive only when the default strategy is reactive", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      defaultStrategy: "reactive",
    });
    const strategy = cachingFeature(config).strategy as Record<string, unknown>;
    expect(strategy.reactive).toEqual(
      expect.objectContaining({ staleTime: 0, refetchInterval: 0 }),
    );
    expect(strategy.reactive as Record<string, unknown>).toHaveProperty(
      "refetchOnReconnect",
      false,
    );
    expect(strategy.reactive as Record<string, unknown>).toHaveProperty(
      "refetchOnFocus",
      false,
    );
  });

  it("includes strategy patterns under caching when provided", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      patterns: { "/api/*": "network-first" },
    });
    const strategy = cachingFeature(config).strategy as Record<string, unknown>;
    expect(strategy.patterns).toEqual({ "/api/*": "network-first" });
  });

  it("emits mutationQueue.backgroundSync even when false", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      mutationEnabled: true,
    });
    const mq = cachingFeature(config).mutationQueue as Record<string, unknown>;
    expect(mq.backgroundSync).toBe(false);
  });

  it("keeps explicit booleans that were toggled on", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      mutationEnabled: true,
      backgroundSync: true,
    });
    const mq = cachingFeature(config).mutationQueue as Record<string, unknown>;
    expect(mq.backgroundSync).toBe(true);
  });

  it("includes mutationQueue under caching when mutationEnabled", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      mutationEnabled: true,
    });
    const mq = cachingFeature(config).mutationQueue as Record<string, unknown>;
    expect(mq.enabled).toBe(true);
    expect(mq.batchSize).toBe(1);
    expect(mq.batchDelayMs).toBe(0);
    expect(mq.retry).toEqual(
      expect.objectContaining({ maxRetries: 5, backoffMs: 1000 }),
    );
  });

  it("includes tagInvalidation under caching when enabled", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      tagInvalidationEnabled: true,
    });
    const tag = cachingFeature(config).tagInvalidation as Record<
      string,
      unknown
    >;
    expect(tag.enabled).toBe(true);
    expect(tag.debounceMs).toBe(0);
    expect(tag.skipPrefixes).toEqual([
      "api",
      "v1",
      "v2",
      "v3",
      "rest",
      "graphql",
      "gql",
    ]);
    expect(tag).toHaveProperty("patterns", {});
    expect(tag).toHaveProperty("singularization", {});
    expect(tag).toHaveProperty("cascading", {});
  });

  it("includes graphql under caching when enabled", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      graphqlEnabled: true,
    });
    const gql = cachingFeature(config).graphql as Record<string, unknown>;
    expect(gql.enabled).toBe(true);
    expect(gql.endpoints).toEqual(["/graphql"]);
  });

  it("includes serverPush under caching when enabled", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      cachingEnabled: true,
      serverPushEnabled: true,
    });
    expect(cachingFeature(config).serverPush).toEqual(
      expect.objectContaining({
        enabled: true,
        type: "sse",
        endpoint: "/api/events",
        reconnectDelayMs: 5000,
      }),
    );
  });

  it("includes pushNotifications when enabled", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      pushNotificationsEnabled: true,
    });
    expect(config.features).toHaveProperty("pushNotifications");
    expect((config.features as Record<string, unknown>).pushNotifications).toBe(
      true,
    );
  });

  it("precacheDirs is omitted unless specified", () => {
    const config = buildMinimalConfig(baseAnswers);
    expect(config.build).not.toHaveProperty("precacheDirs");
  });

  it("includes precacheDirs with all its fields when specified", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      precacheDirs: { "dist/client": { prefix: "/" } },
    });
    expect(config.build).toHaveProperty("precacheDirs");
    expect((config.build as Record<string, unknown>).precacheDirs).toEqual({
      "dist/client": {
        prefix: "/",
        matchExtensions: [],
        stripExtensions: [],
        stripSuffixes: [],
        excludeDirs: [],
        excludeFiles: [],
      },
    });
  });

  it("keeps provided precacheDir fields when specified", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      precacheDirs: {
        ".next/static": { prefix: "/_next/static", stripExtensions: [".html"] },
      },
    });
    expect((config.build as Record<string, unknown>).precacheDirs).toEqual({
      ".next/static": {
        prefix: "/_next/static",
        stripExtensions: [".html"],
        matchExtensions: [],
        stripSuffixes: [],
        excludeDirs: [],
        excludeFiles: [],
      },
    });
  });

  it("includes all build child fields by default", () => {
    const config = buildMinimalConfig(baseAnswers);
    expect(config.build).toEqual({
      swOutput: "dist",
      swoffPath: ".",
      swUrl: "/swoff.sw.js",
    });
  });

  it("does not emit precacheDirs when only build defaults are used", () => {
    const config = buildMinimalConfig({
      ...baseAnswers,
      precacheDirs: {},
    });
    expect(config.build).not.toHaveProperty("precacheDirs");
  });

  it("omits the caching block entirely when no caching options selected", () => {
    const config = buildMinimalConfig(baseAnswers);
    expect(config.features).not.toHaveProperty("caching");
  });

  it("has $schema and framework at top level", () => {
    const config = buildMinimalConfig(baseAnswers);
    expect(config).toHaveProperty("$schema");
    expect(config.$schema).toBe("https://swoff.space/schema/v2.json");
  });
});