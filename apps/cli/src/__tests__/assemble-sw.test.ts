import { describe, it, expect } from "vitest";
import { assembleSW } from "../lib/generators/sw-sections/assemble-sw.js";
import { defaultConfig, type SwoffConfig } from "../lib/shared/config-types.js";

describe("assembleSW", () => {
  const config: SwoffConfig = {
    ...defaultConfig,
  };

  it("generates a service worker string", () => {
    const sw = assembleSW(config);
    expect(sw).toContain("self.addEventListener");
    expect(sw).toContain('"swoff-runtime"');
    expect(sw).toContain('"swoff-runtime-html"');
  });

  it("includes install skipWaiting and background precache progress", () => {
    const sw = assembleSW(config);
    expect(sw).toContain('self.addEventListener("install"');
    expect(sw).toContain("SW_PROGRESS");
  });

  it("includes activate handler with clients.claim()", () => {
    const sw = assembleSW(config);
    expect(sw).toContain('self.addEventListener("activate"');
    expect(sw).toContain("self.clients.claim()");
  });

  it("includes fetch handler with strategies", () => {
    const sw = assembleSW(config);
    expect(sw).toContain('self.addEventListener("fetch"');
    expect(sw).toContain("cacheFirst");
    expect(sw).toContain("networkFirst");
    expect(sw).toContain("staleWhileRevalidate");
    expect(sw).toContain("cacheOnly");
    expect(sw).toContain('"network-only"');
    expect(sw).toContain("reactiveStrategy");
  });

  it("checks serve-from-cache from all strategies", () => {
    const sw = assembleSW(config);
    expect(sw).toContain("fromPrecache");
    expect(sw).toContain("async function fromPrecache");
    expect(sw).toContain("cache.match(url.href)");
    expect(sw).toContain("serveFromCache");
    expect(sw).toContain('NAV_MODE === "spa"');
  });

  it("includes message handler", () => {
    const sw = assembleSW(config);
    expect(sw).toContain('self.addEventListener("message"');
    expect(sw).toContain("SKIP_WAITING");
  });

  it("includes tag management when tagInvalidation enabled", () => {
    const configWithTags: SwoffConfig = {
      ...config,
      features: {
        ...config.features,
        tagInvalidation: { ...config.features.tagInvalidation, enabled: true },
      },
    };
    const sw = assembleSW(configWithTags);
    expect(sw).toContain("invalidateByTag");
    expect(sw).toContain("INVALIDATE_TAG");
  });

  it("excludes tag management when tagInvalidation disabled", () => {
    const sw = assembleSW(config);
    expect(sw).not.toContain("invalidateByTag");
  });

  it("includes background sync handler when enabled", () => {
    const configWithSync: SwoffConfig = {
      ...config,
      features: {
        ...config.features,
        mutationQueue: {
          ...config.features.mutationQueue,
          enabled: true,
          backgroundSync: true,
        },
      },
    };
    const sw = assembleSW(configWithSync);
    expect(sw).toContain('self.addEventListener("sync"');
    expect(sw).toContain("sync-mutations");
  });

  it("excludes background sync when disabled", () => {
    const sw = assembleSW(config);
    expect(sw).not.toContain('self.addEventListener("sync"');
  });

  it("sets AUTO_SKIP_WAITING based on autoActivate config", () => {
    const configAutoActivate: SwoffConfig = {
      ...config,
      features: {
        ...config.features,
        serviceWorker: { ...config.features.serviceWorker, autoActivate: true },
      },
    };
    const sw = assembleSW(configAutoActivate);
    expect(sw).toContain("let AUTO_SKIP_WAITING = true");

    const configNoAutoActivate: SwoffConfig = {
      ...config,
      features: {
        ...config.features,
        serviceWorker: {
          ...config.features.serviceWorker,
          autoActivate: false,
        },
      },
    };
    const sw2 = assembleSW(configNoAutoActivate);
    expect(sw2).toContain("let AUTO_SKIP_WAITING = false");
  });

  it("includes build-time CACHE_NAME timestamp", () => {
    const sw = assembleSW(config);
    expect(sw).toContain("CACHE_NAME = \"");
  });

  it("includes PWA assets when pwa feature is enabled", () => {
    const configWithPwa: SwoffConfig = {
      ...config,
      features: {
        ...config.features,
        pwa: { enabled: true, preventDefaultInstall: false },
      },
    };
    const sw = assembleSW(configWithPwa);
    expect(sw).toContain("/manifest.json");
  });

  it("excludes PWA assets when pwa feature is disabled", () => {
    const configNoPwa: SwoffConfig = {
      ...config,
      features: {
        ...config.features,
        pwa: { enabled: false, preventDefaultInstall: false },
      },
    };
    const sw = assembleSW(configNoPwa);
    expect(sw).not.toContain("/manifest.json");
  });

  it("includes custom strategies in fetch handler", () => {
    const configWithStrategies: SwoffConfig = {
      ...config,
      features: {
        ...config.features,
        serviceWorker: {
          ...config.features.serviceWorker,
          strategy: {
            ...config.features.serviceWorker.strategy,
            patterns: { "/api/*": "network-first" },
          },
        },
      },
    };
    const sw = assembleSW(configWithStrategies);
    expect(sw).toContain("/api/*");
    expect(sw).toContain("network-first");
    expect(sw).toContain("new URL(request.url).pathname");
    expect(sw).toContain("matchGlob");
  });

  describe("navigation rules", () => {
    it("generates NAV_RULES constant when rules are configured", () => {
      const configWithRules: SwoffConfig = {
        ...config,
        features: {
          ...config.features,
          serviceWorker: {
            ...config.features.serviceWorker,
            navigation: {
              ...config.features.serviceWorker.navigation,
              rules: [
                { match: "/blog/*", fallback: "/blog-offline.html" },
                { match: "/dashboard/**", fallback: "/dashboard-offline.html" },
              ],
            },
          },
        },
      };
      const sw = assembleSW(configWithRules);
      expect(sw).toContain("NAV_RULES");
      expect(sw).toContain("/blog/*");
      expect(sw).toContain("/dashboard/**");
    });

    it("generates matchRouteFallback function", () => {
      const configWithRules: SwoffConfig = {
        ...config,
        features: {
          ...config.features,
          serviceWorker: {
            ...config.features.serviceWorker,
            navigation: {
              ...config.features.serviceWorker.navigation,
              rules: [{ match: "/blog/*" }],
            },
          },
        },
      };
      const sw = assembleSW(configWithRules);
      expect(sw).toContain("function matchRouteFallback(url)");
      expect(sw).toContain("matchGlob(path, rule.match)");
    });

    it("includes rule offline fallback pages in ASSETS_TO_CACHE", () => {
      const configWithRules: SwoffConfig = {
        ...config,
        features: {
          ...config.features,
          serviceWorker: {
            ...config.features.serviceWorker,
            navigation: {
              ...config.features.serviceWorker.navigation,
              rules: [
                { match: "/blog/*", fallback: "/blog-offline.html" },
                { match: "/dashboard/**", fallback: "/dashboard-offline.html" },
              ],
            },
          },
        },
      };
      const sw = assembleSW(configWithRules);
      expect(sw).toContain("/blog-offline.html");
      expect(sw).toContain("/dashboard-offline.html");
    });

    it("includes cache-first rule routes in ASSETS_TO_CACHE", () => {
      const configWithRules: SwoffConfig = {
        ...config,
        features: {
          ...config.features,
          serviceWorker: {
            ...config.features.serviceWorker,
            navigation: {
              ...config.features.serviceWorker.navigation,
              rules: [
                { match: "/", fallback: "/offline.html" },
                { match: "/about" },
              ],
            },
          },
        },
      };
      const sw = assembleSW(configWithRules);
      expect(sw).toContain("/");
      expect(sw).toContain("/about");
    });

    it("does not generate NAV_RULES when no rules configured", () => {
      const sw = assembleSW(config);
      expect(sw).not.toContain("NAV_RULES");
    });
  });

  describe("offline fallback analytics", () => {
    it("generates OFFLINE_FALLBACK_ACTIVATED postMessage in ultimate fallback", () => {
      const sw = assembleSW(config);
      expect(sw).toContain("OFFLINE_FALLBACK_ACTIVATED");
    });

    it("generates FALLBACK_PATH constant for global fallback", () => {
      const configWithOfflineFallback: SwoffConfig = {
        ...config,
        features: {
          ...config.features,
          serviceWorker: {
            ...config.features.serviceWorker,
            navigation: {
              ...config.features.serviceWorker.navigation,
              fallback: "/offline.html",
            },
          },
        },
      };
      const sw = assembleSW(configWithOfflineFallback);
      expect(sw).toContain('FALLBACK_PATH = "/offline.html"');
    });

    it("generates OFFLINE_FALLBACK_ACTIVATED postMessage for route fallback in fromUltimateFallback", () => {
      const configWithRules: SwoffConfig = {
        ...config,
        features: {
          ...config.features,
          serviceWorker: {
            ...config.features.serviceWorker,
            navigation: {
              ...config.features.serviceWorker.navigation,
              rules: [{ match: "/blog/*", fallback: "/blog-offline.html" }],
            },
          },
        },
      };
      const sw = assembleSW(configWithRules);
      expect(sw).toContain("OFFLINE_FALLBACK_ACTIVATED");
      expect(sw).toContain("route-fallback");
    });

    it("generates inline-503 fallback with reset button", () => {
      const sw = assembleSW(config);
      expect(sw).toContain("inline-503");
      expect(sw).toContain("sbtn");
      expect(sw).toContain("RESET_CACHE");
      expect(sw).toContain("Reset &amp; Recover");
    });
  });
});
