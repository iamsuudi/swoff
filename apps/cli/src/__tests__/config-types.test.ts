import { describe, it, expect } from "vitest";
import {
  defaultConfig,
  defaultInitConfig,
  KNOWN_FEATURES,
  VALID_STRATEGIES,
  API_PREFIXES,
  OBJECT_FEATURES,
} from "../lib/shared/config-types.js";

describe("config-types", () => {
  describe("defaultConfig", () => {
    it("has all required fields", () => {
      expect(defaultConfig).toHaveProperty("features");
      expect(defaultConfig).toHaveProperty("build");
    });

    it("has correct default values", () => {
      expect(defaultConfig.features.serviceWorker.autoActivate).toBe(false);
      expect(defaultConfig.features.serviceWorker.strategy.default).toBe(
        "cache-first",
      );
      expect(
        defaultConfig.features.serviceWorker.strategy.maxRuntimeCacheAge,
      ).toBe(2592000);
      expect(defaultConfig.features.serviceWorker.navigation.mode).toBe("spa");
      expect(defaultConfig.features.serviceWorker.navigation.fallback).toBe("");
      expect(defaultConfig.features.serviceWorker.navigation.rules).toEqual([]);
      expect(defaultConfig.features.serviceWorker.navigation.mode).toBe("spa");
      expect(defaultConfig.build.outputDir).toBe("dist");
      expect(defaultConfig.build.swFilename).toBe("sw");
      expect(defaultConfig.features.pwa.enabled).toBe(false);
      expect(defaultConfig.features.pwa.preventDefaultInstall).toBe(false);
    });

    it("has all known features with correct types", () => {
      for (const feature of KNOWN_FEATURES) {
        expect(defaultConfig.features).toHaveProperty(feature);
        if (
          feature === "auth" ||
          feature === "serverPush" ||
          feature === "mutationQueue" ||
          feature === "graphql" ||
          feature === "refetchQueue"
        ) {
          expect(typeof defaultConfig.features[feature]).toBe("object");
        } else {
          expect(typeof defaultConfig.features[feature]).toBe("boolean");
        }
      }
    });

    it("has object features with correct shape", () => {
      expect(typeof defaultConfig.features.pwa).toBe("object");
      expect(typeof defaultConfig.features.pwa.enabled).toBe("boolean");
      expect(typeof defaultConfig.features.pwa.preventDefaultInstall).toBe(
        "boolean",
      );
    });

    it("has empty patterns by default", () => {
      expect(defaultConfig.features.serviceWorker.strategy.patterns).toEqual(
        {},
      );
    });

    it("has reactive defaults", () => {
      expect(
        defaultConfig.features.serviceWorker.strategy.reactive.defaults
          .staleTime,
      ).toBe(0);
      expect(
        defaultConfig.features.serviceWorker.strategy.reactive.defaults
          .refetchInterval,
      ).toBe(0);
      expect(
        defaultConfig.features.serviceWorker.strategy.reactive.defaults
          .refetchOnReconnect,
      ).toBe(false);
      expect(
        defaultConfig.features.serviceWorker.strategy.reactive.defaults
          .refetchOnFocus,
      ).toBe(false);
    });

    it("has refetchQueue defaults", () => {
      expect(defaultConfig.features.refetchQueue.retry.maxRetries).toBe(3);
      expect(defaultConfig.features.refetchQueue.retry.backoffMs).toBe(1000);
      expect(defaultConfig.features.refetchQueue.retry.maxBackoffMs).toBe(
        10000,
      );
      expect(defaultConfig.features.refetchQueue.retry.jitterMs).toBe(100);
    });

    it("has tagInvalidation with debounceMs", () => {
      expect(defaultConfig.features.tagInvalidation.debounceMs).toBe(0);
    });
  });

  describe("defaultInitConfig", () => {
    it("includes $schema field", () => {
      expect(defaultInitConfig.$schema).toBe(
        "https://swoff.netlify.app/schema/v1.json",
      );
    });

    it("has default patterns for API and static", () => {
      expect(
        defaultInitConfig.features.serviceWorker.strategy.patterns,
      ).toEqual({
        "/api/*": "network-first",
        "/static/*": "cache-first",
      });
    });
  });

  describe("constants", () => {
    it("KNOWN_FEATURES lists all known features", () => {
      expect(KNOWN_FEATURES).toContain("mutationQueue");
      expect(KNOWN_FEATURES).toContain("auth");
      expect(KNOWN_FEATURES).toContain("graphql");
      expect(KNOWN_FEATURES).not.toContain("realtime");
      expect(KNOWN_FEATURES).not.toContain("clientRegistration");
      expect(KNOWN_FEATURES).not.toContain("pwa");
      expect(KNOWN_FEATURES).not.toContain("serviceWorker");
      expect(KNOWN_FEATURES).not.toContain("versionedSw");
    });

    it("OBJECT_FEATURES lists object-typed features", () => {
      expect(OBJECT_FEATURES).toContain("pwa");
      expect(OBJECT_FEATURES).toContain("serviceWorker");
      expect(OBJECT_FEATURES).toContain("auth");
      expect(OBJECT_FEATURES).toContain("serverPush");
      expect(OBJECT_FEATURES).toContain("graphql");
      expect(OBJECT_FEATURES).toContain("mutationQueue");
      expect(OBJECT_FEATURES).toContain("tagInvalidation");
    });

    it("VALID_STRATEGIES contains all 6 strategies", () => {
      expect(VALID_STRATEGIES).toContain("cache-first");
      expect(VALID_STRATEGIES).toContain("network-first");
      expect(VALID_STRATEGIES).toContain("stale-while-revalidate");
      expect(VALID_STRATEGIES).toContain("cache-only");
      expect(VALID_STRATEGIES).toContain("network-only");
      expect(VALID_STRATEGIES).toContain("reactive");
      expect(VALID_STRATEGIES).toHaveLength(6);
    });

    it("API_PREFIXES contains common prefixes", () => {
      expect(API_PREFIXES).toContain("api");
      expect(API_PREFIXES).toContain("v1");
      expect(API_PREFIXES).toContain("graphql");
    });
  });
});
