import { describe, it, expect } from "vitest";
import { validateConfig } from "../lib/config/validator.js";

describe("validateConfig", () => {
  const validConfig = {
    enabled: true,
    version: "from-package",
    minSupportedVersion: "1.0.0",
    serviceWorker: {
      autoRegister: true,
      autoActivate: false,
      defaultStrategy: "cache-first",
      strategies: {},
    },
    features: {
      versionedSw: true,
      mutationQueue: false,
      backgroundSync: false,
      pwa: { enabled: true, preventDefaultInstall: false },
      auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
      crossTabSync: true,
      tagInvalidation: true,
      clientRegistration: true,
      indexeddb: { enabled: false, name: "app-db", stores: [] },
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

    it("fails when version is missing", () => {
      const { version, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors[0]).toContain("Missing required fields");
    });

    it("fails when serviceWorker is missing", () => {
      const { serviceWorker, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
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
    it("rejects invalid autoRegister type", () => {
      const config = {
        ...validConfig,
        serviceWorker: { ...validConfig.serviceWorker, autoRegister: "yes" },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("serviceWorker.autoRegister must be a boolean");
    });

    it("rejects invalid autoActivate type", () => {
      const cfg = { ...validConfig,
        serviceWorker: { ...validConfig.serviceWorker, autoActivate: 1 },
      };
      const errors = validateConfig(cfg as unknown as Record<string, unknown>);
      expect(errors).toContain("serviceWorker.autoActivate must be a boolean");
    });

    it("rejects invalid defaultStrategy", () => {
      const config = {
        ...validConfig,
        serviceWorker: { ...validConfig.serviceWorker, defaultStrategy: "magic-cache" },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid defaultStrategy");
    });

    it("rejects invalid strategy in strategies", () => {
      const config = {
        ...validConfig,
        serviceWorker: {
          ...validConfig.serviceWorker,
          strategies: { "/api/*": "invalid" },
        },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid strategy");
    });

    it("accepts all valid strategies", () => {
      const strategies = ["cache-first", "network-first", "stale-while-revalidate", "cache-only", "network-only"];
      for (const strategy of strategies) {
        const config = {
          ...validConfig,
          serviceWorker: { ...validConfig.serviceWorker, defaultStrategy: strategy },
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

    it("validates indexeddb.name is string", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, indexeddb: { enabled: false, name: 123, stores: [] } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.indexeddb.name must be a string");
    });

    it("validates indexeddb.stores is array", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, indexeddb: { enabled: false, name: "db", stores: "todos" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.indexeddb.stores must be an array");
    });

    it("accepts valid indexeddb config", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, indexeddb: { enabled: true, name: "my-db", stores: ["todos", "users"] } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects crossTabSync without tagInvalidation", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, crossTabSync: true, tagInvalidation: false },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("crossTabSync requires tagInvalidation to be enabled");
    });

    it("rejects backgroundSync without mutationQueue", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, backgroundSync: true, mutationQueue: false },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("backgroundSync requires mutationQueue to be enabled");
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
    it("accepts from-package", () => {
      const config = { ...validConfig, version: "from-package" };
      expect(validateConfig(config)).toEqual([]);
    });

    it("accepts valid semver", () => {
      const config = { ...validConfig, version: "1.2.3" };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects invalid version format", () => {
      const config = { ...validConfig, version: "latest" };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid version");
    });
  });

  describe("minSupportedVersion validation", () => {
    it("accepts valid semver", () => {
      const config = { ...validConfig, minSupportedVersion: "0.1.0" };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects invalid format", () => {
      const config = { ...validConfig, minSupportedVersion: "beta" };
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
