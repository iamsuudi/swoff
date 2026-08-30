import { describe, it, expect } from "vitest";
import { validateConfig } from "../lib/config/validator.js";
import type { SwoffConfig } from "../lib/shared/config-types.js";

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

describe("validateConfig", () => {
  const validConfig: DeepPartial<SwoffConfig> = {
    features: {
      connectivity: { enabled: true, heartbeatIntervalMs: 30000 },
      pwa: { enabled: true, preventDefaultInstall: false },
      serviceWorker: {
        autoActivate: false,
      },
      auth: { enabled: false, type: "cookie", routePaths: [] },
      caching: {
        enabled: true,
        strategy: {
          default: "cache-first",
          patterns: {},
          reactive: {
            staleTime: 0,
            refetchInterval: 0,
            refetchOnReconnect: false,
            refetchOnFocus: false,
          },
        },
        navigation: {
          mode: "spa",
          fallback: "/index.html",
        },
        mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0 },
        tagInvalidation: {},
        graphql: { enabled: false, endpoints: ["/graphql"] },
      },
    },
    build: { swOutput: "dist" },
  };

  describe("required fields", () => {
    it("passes valid config", () => {
      const errors = validateConfig(validConfig as SwoffConfig);
      expect(errors).toEqual([]);
    });

    it("fails when features is missing", () => {
      const { features: _, ...rest } = validConfig;
      const errors = validateConfig(rest as unknown as SwoffConfig);
      expect(errors[0]).toContain("Missing required fields");
    });

    it("fails when build is missing", () => {
      const { build: _, ...rest } = validConfig;
      const errors = validateConfig(rest as unknown as SwoffConfig);
      expect(errors[0]).toContain("Missing required fields");
    });
  });

  describe("caching validation", () => {
    it("rejects invalid default strategy", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, strategy: { ...validConfig.features.caching.strategy, default: "magic-cache" } } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain("Invalid features.caching.strategy.default");
    });

    it("rejects invalid strategy in patterns", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, strategy: { ...validConfig.features.caching.strategy, patterns: { "/api/*": "invalid" } } } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain("Invalid strategy");
    });

    it("rejects staleTime on non-reactive strategy", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, strategy: { ...validConfig.features.caching.strategy, patterns: { "/api/*": { strategy: "cache-first", staleTime: 30 } } } } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain('staleTime is only valid with "reactive" strategy');
    });

    it("rejects refetchInterval on non-reactive strategy", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, strategy: { ...validConfig.features.caching.strategy, patterns: { "/api/*": { strategy: "stale-while-revalidate", refetchInterval: 15 } } } } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain('refetchInterval is only valid with "reactive" strategy');
    });

    it("accepts reactive strategy with all reactive fields", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, strategy: { ...validConfig.features.caching.strategy, patterns: { "/api/*": { strategy: "reactive", staleTime: 30, refetchInterval: 15, refetchOnFocus: true, refetchOnReconnect: true } } } } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toEqual([]);
    });

    it("rejects invalid staleTime on reactive strategy", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, strategy: { ...validConfig.features.caching.strategy, patterns: { "/api/*": { strategy: "reactive", staleTime: -5 } } } } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain("staleTime must be a non-negative number");
    });

    it("accepts all valid strategies", () => {
      const strategies = ["cache-first", "network-first", "stale-while-revalidate", "cache-only", "network-only", "reactive"];
      for (const strategy of strategies) {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          features: { ...validConfig.features, caching: { ...validConfig.features.caching, strategy: { ...validConfig.features.caching.strategy, default: strategy } } },
        };
        const errors = validateConfig(config as SwoffConfig);
        expect(errors).toEqual([]);
      }
    });

    it("validates serviceWorker.autoActivate is boolean", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, autoActivate: 1 } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors).toContain("features.serviceWorker.autoActivate must be a boolean");
    });
  });

  describe("navigation validation", () => {
    it('accepts "ssr", "spa", and "default" navigation modes', () => {
      const configSsr: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "ssr", fallback: "/index.html" } } },
      };
      const configSpa: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "spa", fallback: "/index.html" } } },
      };
      const configDefault: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "default", fallback: "/index.html" } } },
      };
      expect(validateConfig(configSsr as SwoffConfig)).toEqual([]);
      expect(validateConfig(configSpa as SwoffConfig)).toEqual([]);
      expect(validateConfig(configDefault as SwoffConfig)).toEqual([]);
    });

    it("rejects invalid navigation mode", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "invalid", fallback: "/index.html" } } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain("navigation.mode");
    });

    it("rejects non-array precacheRoutes", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "spa", fallback: "/index.html", precacheRoutes: "/about" } } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors[0]).toContain("precacheRoutes must be an array");
    });

    it("rejects precacheRoutes with non-string elements", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "spa", fallback: "/index.html", precacheRoutes: [123] } } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors[0]).toContain("precacheRoutes must be an array");
    });

    it("rejects non-array rules", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "spa", fallback: "/index.html", rules: "not-an-array" } } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors[0]).toContain("navigation.rules must be an array");
    });

    it("validates rules[].match is a non-empty string", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "spa", fallback: "/index.html", rules: [{ match: "" }] } } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors[0]).toContain("match must be a non-empty string");
    });

    it("validates rules[].fallback is a string", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "spa", fallback: "/index.html", rules: [{ match: "/blog/*", fallback: 123 }] } } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors[0]).toContain("fallback must be a string");
    });

    it("accepts valid rules", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: { ...validConfig.features.caching, navigation: { mode: "spa", fallback: "/index.html", rules: [
          { match: "/blog/*", fallback: "/blog-offline.html" },
          { match: "/dashboard/**", fallback: "/dashboard-offline.html" },
          { match: "/api/status" },
          { match: "/notes/**" },
        ] } } },
      };
      expect(validateConfig(config as SwoffConfig)).toEqual([]);
    });
  });

  describe("features validation", () => {
    it("rejects unknown features", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, unknownFeature: true },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain('Unknown feature "unknownFeature"');
    });

    it("rejects boolean for object feature pwa", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, pwa: true },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain('Feature "pwa" must be an object');
    });

    it("rejects boolean for object feature caching", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: true },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain('Feature "caching" must be an object');
    });

    it("reports old flat v1 keys with a migration hint", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors).toContain(
        'Feature "mutationQueue" moved to "features.caching.mutationQueue" in schema v2 — it requires features.caching.enabled',
      );
    });

    it("accepts object feature pwa", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: true, preventDefaultInstall: false } },
      };
      expect(validateConfig(config as SwoffConfig)).toEqual([]);
    });

    it("validates pwa.enabled is boolean", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: "yes", preventDefaultInstall: false } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain("features.pwa.enabled must be a boolean");
    });

    it("validates pwa.preventDefaultInstall is boolean", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: true, preventDefaultInstall: "true" } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain("features.pwa.preventDefaultInstall must be a boolean");
    });

    it("validates connectivity config", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, connectivity: { enabled: true, heartbeatIntervalMs: -5 } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain(
        "features.connectivity.heartbeatIntervalMs must be a non-negative integer",
      );
    });

    it("rejects backgroundSync without mutationQueue enabled", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: {
          ...validConfig.features.caching,
          mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, backgroundSync: true },
        } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain("features.caching.mutationQueue.backgroundSync requires mutationQueue to be enabled");
    });

    it("passes backgroundSync with caching, mutationQueue, and tagInvalidation enabled", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: {
          ...validConfig.features.caching,
          tagInvalidation: { enabled: true },
          mutationQueue: { enabled: true, batchSize: 5, batchDelayMs: 500, backgroundSync: true },
        } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toEqual([]);
    });

    it("validates mutationQueue.batchSize must be a positive integer", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: {
          ...validConfig.features.caching,
          mutationQueue: { enabled: true, batchSize: 0 },
        } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain("features.caching.mutationQueue.batchSize must be a positive integer");
    });

    it("validates mutationQueue.retry.maxRetries must be a non-negative integer", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: {
          ...validConfig.features.caching,
          mutationQueue: { enabled: true, retry: { maxRetries: -1 } },
        } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors[0]).toContain("mutationQueue.retry.maxRetries must be a non-negative integer");
    });

    it("validates auth.enabled is boolean", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: "yes", type: "cookie" } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain("features.auth.enabled must be a boolean");
    });

    it("validates auth.type is valid", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "invalid" } },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors[0]).toContain('features.auth.type must be one of');
    });

    it("rejects a caching leaf without caching.enabled", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: {
          enabled: false,
          tagInvalidation: { enabled: true },
        } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors).toContain(
        "features.caching.tagInvalidation.enabled requires features.caching.enabled to be true",
      );
    });

    it("rejects serverPush without tagInvalidation", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: { ...validConfig.features, caching: {
          ...validConfig.features.caching,
          enabled: true,
          mutationQueue: { enabled: false },
          serverPush: { enabled: true, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 },
        } },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors).toContain(
        "features.caching.serverPush.enabled requires features.caching.tagInvalidation.enabled to be true",
      );
    });

    it("rejects serverPush with bearer auth", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        features: {
          ...validConfig.features,
          auth: { enabled: true, type: "bearer" },
          caching: {
            ...validConfig.features.caching,
            serverPush: { enabled: true, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 },
          },
        },
      };
      const errors = validateConfig(config as unknown as SwoffConfig);
      expect(errors).toContain(
        "features.caching.serverPush is not supported with bearer auth — use cookie auth instead",
      );
    });
  });

  describe("build validation", () => {
    it("rejects non-string swOutput", () => {
      const config: DeepPartial<SwoffConfig> = {
        ...validConfig,
        build: { ...validConfig.build, swOutput: 123 },
      };
      const errors = validateConfig(config as SwoffConfig);
      expect(errors).toContain("build.swOutput must be a non-empty string");
    });

    describe("precacheDirs", () => {
      it("rejects string values (must be objects)", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: { ...validConfig.build, precacheDirs: { ".next/static": "/_next/static" } },
        };
        const errors = validateConfig(config as unknown as SwoffConfig);
        expect(errors[0]).toContain('precacheDirs[".next/static"] must be an object');
      });

      it("accepts object config with prefix, matchExtensions, stripExtensions", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: {
              ".next/static": { prefix: "/_next/static" },
              ".next/server/app": {
                prefix: "",
                matchExtensions: [".html"],
                stripExtensions: [".html"],
              },
            },
          },
        };
        expect(validateConfig(config as SwoffConfig)).toEqual([]);
      });

      it("accepts object config with only prefix (minimum)", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "/prefix" } },
          },
        };
        expect(validateConfig(config as SwoffConfig)).toEqual([]);
      });

      it("rejects object config without prefix field", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { matchExtensions: [".html"] } },
          },
        };
        const errors = validateConfig(config as SwoffConfig);
        expect(errors[0]).toContain('precacheDirs["some-dir"].prefix must be a string');
      });

      it("rejects object config with non-array matchExtensions", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", matchExtensions: ".html" } },
          },
        };
        const errors = validateConfig(config as SwoffConfig);
        expect(errors[0]).toContain('precacheDirs["some-dir"].matchExtensions must be an array of strings');
      });

      it("rejects object config with non-array stripExtensions", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", stripExtensions: "yes" } },
          },
        };
        const errors = validateConfig(config as SwoffConfig);
        expect(errors[0]).toContain('precacheDirs["some-dir"].stripExtensions must be an array of strings');
      });

      it("accepts object config with stripSuffixes", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", stripSuffixes: ["index", "page"] } },
          },
        };
        expect(validateConfig(config as SwoffConfig)).toEqual([]);
      });

      it("rejects object config with non-array stripSuffixes", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", stripSuffixes: "index" } },
          },
        };
        const errors = validateConfig(config as SwoffConfig);
        expect(errors[0]).toContain('precacheDirs["some-dir"].stripSuffixes must be an array of strings');
      });

      it("rejects non-object value", () => {
        const config: DeepPartial<SwoffConfig> = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": 123 },
          },
        };
        const errors = validateConfig(config as SwoffConfig);
        expect(errors[0]).toContain('precacheDirs["some-dir"] must be an object');
      });
    });
  });
});