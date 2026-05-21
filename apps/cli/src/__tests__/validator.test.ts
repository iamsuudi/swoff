import { describe, it, expect } from "vitest";
import { validateConfig } from "../lib/config/validator.js";

describe("validateConfig", () => {
  const validConfig = {
    enabled: true,
    version: "from-package",
    minSupportedVersion: "1.0.0",
    serviceWorker: {
      autoRegister: true,
      autoUpdate: false,
      defaultStrategy: "cache-first",
      strategies: {},
    },
    features: {
      versionedSw: true,
      offlineReads: true,
      mutationQueue: false,
      backgroundSync: false,
      pwa: true,
      auth: false,
      crossTabSync: true,
      tagInvalidation: true,
      clientRegistration: true,
      indexeddb: false,
    },
    pwa: { preventDefaultInstall: false },
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

    it("rejects invalid autoUpdate type", () => {
      const config = {
        ...validConfig,
        serviceWorker: { ...validConfig.serviceWorker, autoUpdate: 1 },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("serviceWorker.autoUpdate must be a boolean");
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

    it("rejects non-boolean feature values", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: "yes" },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('Feature "pwa" must be a boolean');
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

    it("rejects partial semver", () => {
      const config = { ...validConfig, version: "1.0" };
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

  describe("pwa validation", () => {
    it("rejects non-boolean preventDefaultInstall", () => {
      const config = {
        ...validConfig,
        pwa: { preventDefaultInstall: "true" },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("pwa.preventDefaultInstall must be a boolean");
    });

    it("accepts boolean preventDefaultInstall", () => {
      const config = { ...validConfig, pwa: { preventDefaultInstall: true } };
      expect(validateConfig(config)).toEqual([]);
    });
  });

  describe("database validation", () => {
    it("rejects non-string database name", () => {
      const config = {
        ...validConfig,
        database: { name: 123, stores: [] },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("database.name must be a string");
    });

    it("rejects invalid database name pattern", () => {
      const config = {
        ...validConfig,
        database: { name: "my db", stores: [] },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("must match pattern");
    });

    it("rejects non-array stores", () => {
      const config = {
        ...validConfig,
        database: { name: "app-db", stores: "todos" },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("database.stores must be an array");
    });

    it("rejects invalid store names", () => {
      const config = {
        ...validConfig,
        database: { name: "app-db", stores: ["my store"] },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("must match pattern");
    });

    it("accepts valid database config", () => {
      const config = {
        ...validConfig,
        database: { name: "app-db", stores: ["todos", "users"] },
      };
      expect(validateConfig(config)).toEqual([]);
    });
  });
});
