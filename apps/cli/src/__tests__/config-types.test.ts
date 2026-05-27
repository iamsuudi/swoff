import { describe, it, expect } from "vitest";
import { defaultConfig, defaultInitConfig, KNOWN_FEATURES, VALID_STRATEGIES, API_PREFIXES, OBJECT_FEATURES } from "../lib/shared/config-types.js";

describe("config-types", () => {
  describe("defaultConfig", () => {
    it("has all required fields", () => {
      expect(defaultConfig).toHaveProperty("enabled");
      expect(defaultConfig).toHaveProperty("features");
      expect(defaultConfig).toHaveProperty("build");
    });

    it("has correct default values", () => {
      expect(defaultConfig.enabled).toBe(true);
      expect(defaultConfig.features.serviceWorker.autoUpdate).toBe(true);
      expect(defaultConfig.features.serviceWorker.autoActivate).toBe(false);
      expect(defaultConfig.features.serviceWorker.defaultStrategy).toBe("cache-first");
      expect(defaultConfig.features.serviceWorker.clearRuntimeOnUpdate).toBe(false);
      expect(defaultConfig.features.serviceWorker.navigationMode).toBe("spa");
      expect(defaultConfig.features.serviceWorker.spaEntry).toBe("/index.html");
      expect(defaultConfig.features.serviceWorker.version.enabled).toBe(true);
      expect(defaultConfig.features.serviceWorker.version.source).toBe("from-package");
      expect(defaultConfig.features.serviceWorker.version.minSupportedVersion).toBe("0.0.0");
      expect(defaultConfig.build.outputDir).toBe("dist");
      expect(defaultConfig.build.swFilename).toBe("sw");
      expect(defaultConfig.features.pwa.enabled).toBe(true);
      expect(defaultConfig.features.pwa.preventDefaultInstall).toBe(false);
    });

    it("has all known features with correct types", () => {
      for (const feature of KNOWN_FEATURES) {
        expect(defaultConfig.features).toHaveProperty(feature);
        if (feature === "auth" || feature === "pushNotifications" || feature === "mutationQueue" || feature === "graphql" || feature === "serverPush") {
          expect(typeof defaultConfig.features[feature]).toBe("object");
        } else {
          expect(typeof defaultConfig.features[feature]).toBe("boolean");
        }
      }
    });

    it("has object features with correct shape", () => {
      expect(typeof defaultConfig.features.pwa).toBe("object");
      expect(typeof defaultConfig.features.pwa.enabled).toBe("boolean");
      expect(typeof defaultConfig.features.pwa.preventDefaultInstall).toBe("boolean");
    });

    it("has empty strategies by default", () => {
      expect(defaultConfig.features.serviceWorker.strategies).toEqual({});
    });
  });

  describe("defaultInitConfig", () => {
    it("includes $schema field", () => {
      expect(defaultInitConfig.$schema).toBe("https://swoff.netlify.app/schema/v1.json");
    });

    it("has default strategies for API and static", () => {
      expect(defaultInitConfig.features.serviceWorker.strategies).toEqual({
        "/api/*": "network-first",
        "/static/*": "cache-first",
      });
    });

    it("has minSupportedVersion of 1.0.0", () => {
      expect(defaultInitConfig.features.serviceWorker.version.minSupportedVersion).toBe("1.0.0");
    });
  });

  describe("constants", () => {
    it("KNOWN_FEATURES lists all known features", () => {
      expect(KNOWN_FEATURES).toContain("mutationQueue");
      expect(KNOWN_FEATURES).toContain("backgroundSync");
      expect(KNOWN_FEATURES).toContain("auth");
      expect(KNOWN_FEATURES).toContain("crossTabSync");
      expect(KNOWN_FEATURES).toContain("tagInvalidation");
      expect(KNOWN_FEATURES).toContain("graphql");
      expect(KNOWN_FEATURES).toContain("pushNotifications");
      expect(KNOWN_FEATURES).not.toContain("clientRegistration");
      expect(KNOWN_FEATURES).not.toContain("pwa");
      expect(KNOWN_FEATURES).not.toContain("serviceWorker");
      expect(KNOWN_FEATURES).not.toContain("versionedSw");
      expect(KNOWN_FEATURES).not.toContain("autoUpdate");
    });

    it("OBJECT_FEATURES lists object-typed features", () => {
      expect(OBJECT_FEATURES).toContain("pwa");
      expect(OBJECT_FEATURES).toContain("serviceWorker");
      expect(OBJECT_FEATURES).toContain("auth");
      expect(OBJECT_FEATURES).toContain("pushNotifications");
      expect(OBJECT_FEATURES).toContain("graphql");
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
