import { describe, it, expect } from "vitest";
import { validateConfig } from "../lib/config/validator.js";

describe("validateConfig", () => {
  const validConfig: Record<string, any> = {
    enabled: true,
    features: {
      pwa: { enabled: true, preventDefaultInstall: false },
      serviceWorker: {
        version: "package",
        minSupportedVersion: "1.0.0",
        autoUpdate: true,
        autoActivate: false,
        strategy: {
          default: "cache-first",
          patterns: {},
          reactive: {
            defaults: {
              staleTime: 0,
              refetchInterval: 0,
              refetchOnReconnect: false,
              refetchOnFocus: false,
            },
          },
        },
        navigation: {
          mode: "spa",
          fallback: "/index.html",
        },
      },
      refetchQueue: {
        batchSize: 5,
        batchDelayMs: 1000,
        maxRetries: 3,
        retryDelayMs: 1000,
      },
      mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 },
      backgroundSync: false,
      auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
      crossTabSync: true,
      tagInvalidation: {},
      graphql: { enabled: false, endpoint: "/graphql" },
    },
    build: { outputDir: "dist", swFilename: "sw" },
  };

  describe("required fields", () => {
    it("passes valid config", () => {
      const errors = validateConfig(validConfig);
      expect(errors).toEqual([]);
    });

    it("fails when enabled is missing", () => {
      const { enabled: _, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Missing required fields");
    });

    it("fails when features is missing", () => {
      const { features: _, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors[0]).toContain("Missing required fields");
    });

    it("fails when build is missing", () => {
      const { build: _, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors[0]).toContain("Missing required fields");
    });
  });

  describe("serviceWorker validation", () => {
    it("rejects invalid autoUpdate type", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, autoUpdate: "yes" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.serviceWorker.autoUpdate must be a boolean");
    });

    it("rejects invalid autoActivate type", () => {
      const cfg = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, autoActivate: 1 } },
      };
      const errors = validateConfig(cfg as unknown as Record<string, unknown>);
      expect(errors).toContain("features.serviceWorker.autoActivate must be a boolean");
    });

    it("rejects invalid default strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, default: "magic-cache" } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid features.serviceWorker.strategy.default");
    });

    it("rejects invalid strategy in patterns", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": "invalid" } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid strategy");
    });

    it("rejects staleTime on non-reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "cache-first", staleTime: 30 } } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('staleTime is only valid with "reactive" strategy');
    });

    it("rejects refetchInterval on non-reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "stale-while-revalidate", refetchInterval: 15 } } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('refetchInterval is only valid with "reactive" strategy');
    });

    it("accepts reactive strategy with all reactive fields", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "reactive", staleTime: 30, refetchInterval: 15, refetchOnFocus: true, refetchOnReconnect: true } } } } },
      };
      const errors = validateConfig(config);
      expect(errors).toEqual([]);
    });

    it("rejects invalid staleTime on reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "reactive", staleTime: -5 } } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("staleTime must be a non-negative number");
    });

    it("accepts all valid strategies", () => {
      const strategies = ["cache-first", "network-first", "stale-while-revalidate", "cache-only", "network-only", "reactive"];
      for (const strategy of strategies) {
        const config = {
          ...validConfig,
          features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, default: strategy } } },
        };
        const errors = validateConfig(config);
        expect(errors).toEqual([]);
      }
    });
  });

  describe("version validation", () => {
    it('accepts "package" version', () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: "package" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it('accepts "hash" version', () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: "hash" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("accepts valid semver string version", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: "1.2.3" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects false version", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: false as unknown as string } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("features.serviceWorker.version must be a string");
    });

    it("rejects invalid version string", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: "latest" } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('version must be "package", "hash", or a semver string');
    });

    it("rejects version with wrong type", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: true as unknown as string } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("features.serviceWorker.version must be a string");
    });
  });

  describe("minSupportedVersion validation", () => {
    it("accepts valid semver", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, minSupportedVersion: "0.1.0" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects invalid format", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, minSupportedVersion: "beta" } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid minSupportedVersion");
    });
  });

  describe("features validation", () => {
    it("rejects unknown features", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, unknownFeature: true },
      };
      const errors = validateConfig(config);
      expect(errors).toContain('Unknown feature "unknownFeature"');
    });

    it("rejects boolean for object feature pwa", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: true },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('Feature "pwa" must be an object');
    });

    it("rejects boolean for object feature mutationQueue", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: true },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('Feature "mutationQueue" must be an object');
    });

    it("rejects boolean for object feature tagInvalidation", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, tagInvalidation: true },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('Feature "tagInvalidation" must be an object');
    });

    it("accepts object feature pwa", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: true, preventDefaultInstall: false } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("validates pwa.enabled is boolean", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: "yes", preventDefaultInstall: false } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.pwa.enabled must be a boolean");
    });

    it("validates pva.preventDefaultInstall is boolean", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: true, preventDefaultInstall: "true" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.pwa.preventDefaultInstall must be a boolean");
    });

    it("rejects backgroundSync without mutationQueue enabled", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, backgroundSync: true, mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("backgroundSync requires mutationQueue to be enabled");
    });

    it("passes backgroundSync with mutationQueue enabled", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, backgroundSync: true, mutationQueue: { enabled: true, batchSize: 5, batchDelayMs: 500, maxRetries: 3, retryBackoffMs: 2000 } },
      };
      const errors = validateConfig(config);
      expect(errors).toEqual([]);
    });

    it("validates mutationQueue.batchSize must be a positive integer", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true, batchSize: 0 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.mutationQueue.batchSize must be a positive integer");
    });

    it("validates mutationQueue.maxRetries must be a positive integer", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true, maxRetries: -1 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.mutationQueue.maxRetries must be a positive integer");
    });

    it("validates auth.enabled is boolean", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: "yes", type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.auth.enabled must be a boolean");
    });

    it("validates auth.type is valid", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "invalid", refreshPath: "/api/refresh", userEndpoint: "/api/me" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain('features.auth.type must be "cookie", "bearer", or "custom"');
    });

    it("validates auth.refreshPath is string", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "bearer", refreshPath: 123, userEndpoint: "/api/me" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.auth.refreshPath must be a string");
    });
  });

  describe("build validation", () => {
    it("rejects non-string outputDir", () => {
      const config = {
        ...validConfig,
        build: { ...validConfig.build, outputDir: 123 },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("build.outputDir must be a non-empty string");
    });

    it("rejects non-string swFilename", () => {
      const config = {
        ...validConfig,
        build: { ...validConfig.build, swFilename: true },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("build.swFilename must be a non-empty string");
    });
  });
});
