import { describe, it, expect } from "vitest";
import { buildMinimalConfig, type WizardAnswers } from "../lib/config/minimal-config.js";

const baseAnswers: WizardAnswers = {
  framework: "react",
  swOutput: "dist",
  swFilename: "sw",
  navMode: "spa",
  fallback: "/offline",
  defaultStrategy: "cache-first",
  pwaEnabled: false,
  authEnabled: false,
  mutationEnabled: false,
  tagInvalidationEnabled: false,
  graphqlEnabled: false,
  serverPushEnabled: false,
  pushNotificationsEnabled: false,
};

describe("buildMinimalConfig", () => {
  it("produces config with only serviceWorker feature when no options enabled", () => {
    const config = buildMinimalConfig(baseAnswers);
    expect(config.framework).toBe("react");
    expect(config.features).toHaveProperty("serviceWorker");
    expect(config.features).not.toHaveProperty("pwa");
    expect(config.features).not.toHaveProperty("auth");
    expect(config.features).not.toHaveProperty("mutationQueue");
    expect(config.features).not.toHaveProperty("tagInvalidation");
    expect(config.features).not.toHaveProperty("graphql");
    expect(config.features).not.toHaveProperty("serverPush");
    expect(config.features).not.toHaveProperty("pushNotifications");
    expect(config.build).not.toHaveProperty("precacheDirs");
  });

  it("includes pwa block when pwaEnabled is true", () => {
    const config = buildMinimalConfig({ ...baseAnswers, pwaEnabled: true });
    expect(config.features).toHaveProperty("pwa");
    expect((config.features as Record<string, unknown>).pwa).toEqual({ enabled: true });
  });

  it("includes auth block with type when authEnabled", () => {
    const config = buildMinimalConfig({ ...baseAnswers, authEnabled: true, authType: "bearer" });
    expect(config.features).toHaveProperty("auth");
    expect((config.features as Record<string, unknown>).auth).toEqual({ enabled: true, type: "bearer" });
  });

  it("includes mutationQueue when mutationEnabled", () => {
    const config = buildMinimalConfig({ ...baseAnswers, mutationEnabled: true });
    expect(config.features).toHaveProperty("mutationQueue");
    expect((config.features as Record<string, unknown>).mutationQueue).toEqual({ enabled: true });
  });

  it("includes tagInvalidation when enabled", () => {
    const config = buildMinimalConfig({ ...baseAnswers, tagInvalidationEnabled: true });
    expect(config.features).toHaveProperty("tagInvalidation");
    expect((config.features as Record<string, unknown>).tagInvalidation).toEqual({ enabled: true });
  });

  it("includes graphql when enabled", () => {
    const config = buildMinimalConfig({ ...baseAnswers, graphqlEnabled: true });
    expect(config.features).toHaveProperty("graphql");
    expect((config.features as Record<string, unknown>).graphql).toEqual({ enabled: true });
  });

  it("includes serverPush when enabled", () => {
    const config = buildMinimalConfig({ ...baseAnswers, serverPushEnabled: true });
    expect(config.features).toHaveProperty("serverPush");
    expect((config.features as Record<string, unknown>).serverPush).toEqual({ enabled: true, type: "sse", endpoint: "/api/events" });
  });

  it("includes pushNotifications when enabled", () => {
    const config = buildMinimalConfig({ ...baseAnswers, pushNotificationsEnabled: true });
    expect(config.features).toHaveProperty("pushNotifications");
    expect((config.features as Record<string, unknown>).pushNotifications).toBe(true);
  });

  it("includes precacheDirs when configured", () => {
    const config = buildMinimalConfig({ ...baseAnswers, precacheDir: "dist/client", precachePrefix: "/" });
    expect(config.build).toHaveProperty("precacheDirs");
    expect((config.build as Record<string, unknown>).precacheDirs).toEqual({ "dist/client": { prefix: "/" } });
  });

  it("includes strategy patterns when provided", () => {
    const config = buildMinimalConfig({ ...baseAnswers, patterns: { "/api/*": "network-first" } });
    expect((config.features as Record<string, unknown>).serviceWorker).toHaveProperty("strategy");
    const strategy = ((config.features as Record<string, unknown>).serviceWorker as Record<string, unknown>).strategy as Record<string, unknown>;
    expect(strategy.patterns).toEqual({ "/api/*": "network-first" });
  });

  it("omits strategy patterns when empty", () => {
    const config = buildMinimalConfig(baseAnswers);
    const strategy = ((config.features as Record<string, unknown>).serviceWorker as Record<string, unknown>).strategy as Record<string, unknown>;
    expect(strategy).not.toHaveProperty("patterns");
  });

  it("has $schema and framework at top level", () => {
    const config = buildMinimalConfig(baseAnswers);
    expect(config).toHaveProperty("$schema");
    expect(config.$schema).toBe("https://swoff.netlify.app/schema/v1.json");
  });
});
