import { describe, it, expect } from "vitest";
import { validateConfig } from "../lib/config/validator.js";

describe("validateConfig", () => {
  const validConfig = {
    enabled: true,
    features: {
      pwa: { enabled: true, preventDefaultInstall: false },
      serviceWorker: {
        version: {
          enabled: true,
          source: "from-package",
          minSupportedVersion: "1.0.0",
        },
        autoUpdate: true,
        autoActivate: false,
        defaultStrategy: "cache-first",
        strategies: {},
      },
      mutationQueue: false,
      backgroundSync: false,
      auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
      crossTabSync: true,
      tagInvalidation: true,
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
      const { enabled, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Missing required fields");
    });

    it("fails when features is missing", () => {
      const { features, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors[0]).toContain("Missing required fields");
    });

    it("fails when build is missing", () => {
      const { build, ...rest } = validConfig;
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

    it("rejects invalid defaultStrategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, defaultStrategy: "magic-cache" } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid defaultStrategy");
    });

    it("rejects invalid strategy in strategies", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategies: { "/api/*": "invalid" } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid strategy");
    });

    it("rejects staleTime on non-reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategies: { "/api/*": { strategy: "cache-first", staleTime: 30 } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('staleTime is only valid with "reactive" strategy');
    });

    it("rejects refetchInterval on non-reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategies: { "/api/*": { strategy: "stale-while-revalidate", refetchInterval: 15 } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('refetchInterval is only valid with "reactive" strategy');
    });

    it("accepts reactive strategy with all reactive fields", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategies: { "/api/*": { strategy: "reactive", staleTime: 30, refetchInterval: 15, refetchOnFocus: true, refetchOnReconnect: true } } } },
      };
      const errors = validateConfig(config);
      expect(errors).toEqual([]);
    });

    it("rejects invalid staleTime on reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategies: { "/api/*": { strategy: "reactive", staleTime: -5 } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("staleTime must be a non-negative number");
    });

    it("accepts all valid strategies", () => {
      const strategies = ["cache-first", "network-first", "stale-while-revalidate", "cache-only", "network-only", "reactive"];
      for (const strategy of strategies) {
        const config = {
          ...validConfig,
          features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, defaultStrategy: strategy } },
        };
        const errors = validateConfig(config);
        expect(errors).toEqual([]);
      }
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

    it("validates pwa.preventDefaultInstall is boolean", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: true, preventDefaultInstall: "true" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.pwa.preventDefaultInstall must be a boolean");
    });

    it("rejects crossTabSync without tagInvalidation", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, crossTabSync: true, tagInvalidation: false },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("crossTabSync requires tagInvalidation to be enabled");
    });

    it("rejects backgroundSync without mutationQueue enabled", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, backgroundSync: true, mutationQueue: false },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("backgroundSync requires mutationQueue to be enabled");
    });

    it("rejects backgroundSync with mutationQueue object enabled: false", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, backgroundSync: true, mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("backgroundSync requires mutationQueue to be enabled");
    });

    it("passes backgroundSync with mutationQueue object enabled: true", () => {
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

    it("validates mutationQueue.batchDelayMs must be non-negative integer", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true, batchDelayMs: -5 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.mutationQueue.batchDelayMs must be a non-negative integer");
    });

    it("validates mutationQueue.retryBackoffMs must be non-negative", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true, retryBackoffMs: -1 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.mutationQueue.retryBackoffMs must be a non-negative number");
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

    it("validates auth.userEndpoint is string", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "bearer", refreshPath: "/api/refresh", userEndpoint: 456 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.auth.userEndpoint must be a string");
    });
  });

  describe("version validation", () => {
    it("accepts from-package source", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: { ...validConfig.features.serviceWorker.version, source: "from-package" } } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("accepts valid semver value with manual source", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: { enabled: true, source: "manual", value: "1.2.3", minSupportedVersion: "0.0.0" } } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects missing value when source is manual", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: { enabled: true, source: "manual", minSupportedVersion: "0.0.0" } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("version.value is required when source is 'manual'");
    });

    it("rejects invalid version value format", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: { enabled: true, source: "manual", value: "latest", minSupportedVersion: "0.0.0" } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid version value");
    });
  });

  describe("minSupportedVersion validation", () => {
    it("accepts valid semver", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: { ...validConfig.features.serviceWorker.version, minSupportedVersion: "0.1.0" } } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects invalid format", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: { ...validConfig.features.serviceWorker.version, minSupportedVersion: "beta" } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid minSupportedVersion");
    });
  });

  describe("build validation", () => {
    it("rejects non-string outputDir", () => {
      const config = {
        ...validConfig,
        build: { ...validConfig.build, outputDir: 123 },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("build.outputDir must be a string");
    });

    it("rejects non-string swFilename", () => {
      const config = {
        ...validConfig,
        build: { ...validConfig.build, swFilename: true },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("build.swFilename must be a string");
    });
  });
});
