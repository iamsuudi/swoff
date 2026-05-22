import { describe, it, expect } from "vitest";
import { defaultConfig, defaultInitConfig, KNOWN_FEATURES, VALID_STRATEGIES, API_PREFIXES } from "../lib/shared/config-types.js";

describe("config-types", () => {
  describe("defaultConfig", () => {
    it("has all required fields", () => {
      expect(defaultConfig).toHaveProperty("enabled");
      expect(defaultConfig).toHaveProperty("version");
      expect(defaultConfig).toHaveProperty("minSupportedVersion");
      expect(defaultConfig).toHaveProperty("serviceWorker");
      expect(defaultConfig).toHaveProperty("features");
      expect(defaultConfig).toHaveProperty("pwa");
      expect(defaultConfig).toHaveProperty("database");
      expect(defaultConfig).toHaveProperty("build");
    });

    it("has correct default values", () => {
      expect(defaultConfig.enabled).toBe(true);
      expect(defaultConfig.version).toBe("from-package");
      expect(defaultConfig.minSupportedVersion).toBe("0.0.0");
      expect(defaultConfig.serviceWorker.autoRegister).toBe(true);
      expect(defaultConfig.serviceWorker.autoActivate).toBe(false);
      expect(defaultConfig.serviceWorker.defaultStrategy).toBe("cache-first");
      expect(defaultConfig.build.outputDir).toBe("dist");
      expect(defaultConfig.build.swFilename).toBe("sw");
      expect(defaultConfig.pwa.preventDefaultInstall).toBe(false);
      expect(defaultConfig.database.name).toBe("app-db");
    });

    it("has all known features as booleans", () => {
      for (const feature of KNOWN_FEATURES) {
        expect(defaultConfig.features).toHaveProperty(feature);
        expect(typeof defaultConfig.features[feature]).toBe("boolean");
      }
    });

    it("has empty strategies by default", () => {
      expect(defaultConfig.serviceWorker.strategies).toEqual({});
    });

    it("has empty stores by default", () => {
      expect(defaultConfig.database.stores).toEqual([]);
    });
  });

  describe("defaultInitConfig", () => {
    it("includes $schema field", () => {
      expect(defaultInitConfig.$schema).toBe("https://swoff.netlify.app/schema/v1.json");
    });

    it("has default strategies for API and static", () => {
      expect(defaultInitConfig.serviceWorker.strategies).toEqual({
        "/api/*": "network-first",
        "/static/*": "cache-first",
      });
    });

    it("has minSupportedVersion of 1.0.0", () => {
      expect(defaultInitConfig.minSupportedVersion).toBe("1.0.0");
    });
  });

  describe("constants", () => {
    it("KNOWN_FEATURES contains all expected features", () => {
      expect(KNOWN_FEATURES).toContain("versionedSw");
      expect(KNOWN_FEATURES).toContain("offlineReads");
      expect(KNOWN_FEATURES).toContain("mutationQueue");
      expect(KNOWN_FEATURES).toContain("backgroundSync");
      expect(KNOWN_FEATURES).toContain("pwa");
      expect(KNOWN_FEATURES).toContain("auth");
      expect(KNOWN_FEATURES).toContain("crossTabSync");
      expect(KNOWN_FEATURES).toContain("tagInvalidation");
      expect(KNOWN_FEATURES).toContain("clientRegistration");
      expect(KNOWN_FEATURES).toContain("indexeddb");
    });

    it("VALID_STRATEGIES contains all 5 strategies", () => {
      expect(VALID_STRATEGIES).toContain("cache-first");
      expect(VALID_STRATEGIES).toContain("network-first");
      expect(VALID_STRATEGIES).toContain("stale-while-revalidate");
      expect(VALID_STRATEGIES).toContain("cache-only");
      expect(VALID_STRATEGIES).toContain("network-only");
      expect(VALID_STRATEGIES).toHaveLength(5);
    });

    it("API_PREFIXES contains common prefixes", () => {
      expect(API_PREFIXES).toContain("api");
      expect(API_PREFIXES).toContain("v1");
      expect(API_PREFIXES).toContain("graphql");
    });
  });
});
