import { describe, it, expect } from "vitest";
import { assembleSW } from "../lib/generators/sw-sections/assemble-sw.js";
import { defaultConfig, type SwoffConfig } from "../lib/shared/config-types.js";

describe("assembleSW", () => {
  const config: SwoffConfig = {
    ...defaultConfig,
    version: "1.0.0",
  };

  it("generates a service worker string", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).toContain("CACHE_NAME = 'sw-v1.0.0'");
    expect(sw).toContain("self.addEventListener");
    expect(sw).toContain("SWOFF");
  });

  it("includes config header", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).toContain("Swoff Service Worker - Auto-Generated");
    expect(sw).toContain("Version: 1.0.0");
  });

  it("includes install handler", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).toContain('self.addEventListener("install"');
    expect(sw).toContain("SW_PROGRESS");
  });

  it("includes activate handler", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).toContain('self.addEventListener("activate"');
    expect(sw).toContain("caches.keys()");
  });

  it("includes fetch handler with strategies", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).toContain('self.addEventListener("fetch"');
    expect(sw).toContain("cacheFirst");
    expect(sw).toContain("networkFirst");
    expect(sw).toContain("staleWhileRevalidate");
    expect(sw).toContain("cacheOnly");
    expect(sw).toContain("networkOnly");
  });

  it("includes message handler", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).toContain('self.addEventListener("message"');
    expect(sw).toContain("SKIP_WAITING");
  });

  it("includes tag management when tagInvalidation is enabled", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).toContain("invalidateByTag");
    expect(sw).toContain("INVALIDATE_TAG");
  });

  it("excludes tag management when tagInvalidation is disabled", () => {
    const configWithoutTags: SwoffConfig = {
      ...config,
      features: { ...config.features, tagInvalidation: false },
    };
    const sw = assembleSW(configWithoutTags, "1.0.0");
    expect(sw).not.toContain("invalidateByTag");
    expect(sw).not.toContain("INVALIDATE_TAG");
  });

  it("includes background sync handler when enabled", () => {
    const configWithSync: SwoffConfig = {
      ...config,
      features: { ...config.features, backgroundSync: true },
    };
    const sw = assembleSW(configWithSync, "1.0.0");
    expect(sw).toContain('self.addEventListener("sync"');
    expect(sw).toContain("sync-mutations");
  });

  it("excludes background sync when disabled", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).not.toContain('self.addEventListener("sync"');
  });

  it("sets AUTO_SKIP_WAITING based on autoUpdate config", () => {
    const configAutoUpdate: SwoffConfig = {
      ...config,
      serviceWorker: { ...config.serviceWorker, autoUpdate: true },
    };
    const sw = assembleSW(configAutoUpdate, "1.0.0");
    expect(sw).toContain("const AUTO_SKIP_WAITING = true");

    const configNoAutoUpdate: SwoffConfig = {
      ...config,
      serviceWorker: { ...config.serviceWorker, autoUpdate: false },
    };
    const sw2 = assembleSW(configNoAutoUpdate, "1.0.0");
    expect(sw2).toContain("const AUTO_SKIP_WAITING = false");
  });

  it("includes PWA assets when pwa feature is enabled", () => {
    const configWithPwa: SwoffConfig = {
      ...config,
      features: { ...config.features, pwa: true },
    };
    const sw = assembleSW(configWithPwa, "1.0.0");
    expect(sw).toContain("/manifest.json");
  });

  it("excludes PWA assets when pwa feature is disabled", () => {
    const configNoPwa: SwoffConfig = {
      ...config,
      features: { ...config.features, pwa: false },
    };
    const sw = assembleSW(configNoPwa, "1.0.0");
    expect(sw).not.toContain("/manifest.json");
  });

  it("includes custom strategies in fetch handler", () => {
    const configWithStrategies: SwoffConfig = {
      ...config,
      serviceWorker: {
        ...config.serviceWorker,
        strategies: { "/api/*": "network-first" },
      },
    };
    const sw = assembleSW(configWithStrategies, "1.0.0");
    expect(sw).toContain("/api/*");
    expect(sw).toContain("network-first");
  });

  it("includes trimRuntimeCache when maxCacheEntries is set", () => {
    const configWithTrim: SwoffConfig = {
      ...config,
      serviceWorker: {
        ...config.serviceWorker,
        maxCacheEntries: 100,
      },
    };
    const sw = assembleSW(configWithTrim, "1.0.0");
    expect(sw).toContain("trimRuntimeCache");
    expect(sw).toContain("MAX_CACHE_ENTRIES = 100");
    expect(sw).toContain("MAX_CACHE_AGE = 0");
  });

  it("includes trimRuntimeCache when maxCacheAge is set", () => {
    const configWithTrim: SwoffConfig = {
      ...config,
      serviceWorker: {
        ...config.serviceWorker,
        maxCacheAge: 86400000,
      },
    };
    const sw = assembleSW(configWithTrim, "1.0.0");
    expect(sw).toContain("trimRuntimeCache");
    expect(sw).toContain("MAX_CACHE_AGE = 86400000");
    expect(sw).toContain("MAX_CACHE_ENTRIES = 0");
  });

  it("excludes trimRuntimeCache when no trimming configured", () => {
    const sw = assembleSW(config, "1.0.0");
    expect(sw).not.toContain("trimRuntimeCache");
  });
});
