import { describe, it, expect } from "vitest";
import {
  defaultConfig,
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
      expect(defaultConfig.features.caching.enabled).toBe(false);
      expect(defaultConfig.features.caching.strategy.default).toBe(
        "cache-first",
      );
      expect(
        defaultConfig.features.caching.strategy.maxRuntimeCacheAge,
      ).toBe(2592000);
      expect(defaultConfig.features.caching.navigation.mode).toBe("spa");
      expect(defaultConfig.features.caching.navigation.fallback).toBe("");
      expect(defaultConfig.features.caching.navigation.rules).toEqual([]);
      expect(defaultConfig.features.connectivity.enabled).toBe(false);
      expect(defaultConfig.features.connectivity.heartbeatIntervalMs).toBe(
        30000,
      );
      expect(defaultConfig.build.swOutput).toBe("dist");
      expect(defaultConfig.features.pwa.enabled).toBe(false);
      expect(defaultConfig.features.pwa.preventDefaultInstall).toBe(false);
    });

    it("has all known features with correct types", () => {
      for (const feature of KNOWN_FEATURES) {
        expect(defaultConfig.features).toHaveProperty(feature);
      }
      expect(typeof defaultConfig.features.connectivity).toBe("object");
      expect(typeof defaultConfig.features.pushNotifications).toBe("boolean");
      expect(typeof defaultConfig.features.pwa).toBe("object");
      expect(typeof defaultConfig.features.auth).toBe("object");
      expect(typeof defaultConfig.features.serviceWorker).toBe("object");
      expect(typeof defaultConfig.features.caching).toBe("object");
    });

    it("has object features with correct shape", () => {
      expect(typeof defaultConfig.features.pwa).toBe("object");
      expect(typeof defaultConfig.features.pwa.enabled).toBe("boolean");
      expect(typeof defaultConfig.features.pwa.preventDefaultInstall).toBe(
        "boolean",
      );
      expect(typeof defaultConfig.features.caching.mutationQueue).toBe(
        "object",
      );
      expect(typeof defaultConfig.features.caching.tagInvalidation).toBe(
        "object",
      );
      expect(typeof defaultConfig.features.caching.graphql).toBe("object");
      expect(typeof defaultConfig.features.caching.serverPush).toBe("object");
    });

    it("has empty patterns by default", () => {
      expect(defaultConfig.features.caching.strategy.patterns).toEqual({});
    });

    it("has reactive defaults", () => {
      expect(
        defaultConfig.features.caching.strategy.reactive.staleTime,
      ).toBe(0);
      expect(
        defaultConfig.features.caching.strategy.reactive.refetchInterval,
      ).toBe(0);
      expect(
        defaultConfig.features.caching.strategy.reactive.refetchOnReconnect,
      ).toBe(false);
      expect(
        defaultConfig.features.caching.strategy.reactive.refetchOnFocus,
      ).toBe(false);
    });

    it("has refetchQueue defaults", () => {
      expect(defaultConfig.features.caching.refetchQueue.retry.maxRetries).toBe(
        3,
      );
      expect(defaultConfig.features.caching.refetchQueue.retry.backoffMs).toBe(
        1000,
      );
      expect(
        defaultConfig.features.caching.refetchQueue.retry.maxBackoffMs,
      ).toBe(10000);
      expect(defaultConfig.features.caching.refetchQueue.retry.jitterMs).toBe(
        100,
      );
    });

    it("has tagInvalidation with debounceMs", () => {
      expect(defaultConfig.features.caching.tagInvalidation.debounceMs).toBe(
        0,
      );
    });
  });

  describe("constants", () => {
    it("KNOWN_FEATURES lists all known features", () => {
      expect(KNOWN_FEATURES).toContain("connectivity");
      expect(KNOWN_FEATURES).toContain("pushNotifications");
      expect(KNOWN_FEATURES).toContain("auth");
      expect(KNOWN_FEATURES).toContain("pwa");
      expect(KNOWN_FEATURES).toContain("serviceWorker");
      expect(KNOWN_FEATURES).toContain("caching");
      expect(KNOWN_FEATURES).not.toContain("realtime");
      expect(KNOWN_FEATURES).not.toContain("clientRegistration");
      expect(KNOWN_FEATURES).not.toContain("mutationQueue");
      expect(KNOWN_FEATURES).not.toContain("versionedSw");
    });

    it("OBJECT_FEATURES lists object-typed features", () => {
      expect(OBJECT_FEATURES).toContain("connectivity");
      expect(OBJECT_FEATURES).toContain("pwa");
      expect(OBJECT_FEATURES).toContain("serviceWorker");
      expect(OBJECT_FEATURES).toContain("auth");
      expect(OBJECT_FEATURES).toContain("caching");
      expect(OBJECT_FEATURES).not.toContain("serverPush");
      expect(OBJECT_FEATURES).not.toContain("graphql");
      expect(OBJECT_FEATURES).not.toContain("mutationQueue");
      expect(OBJECT_FEATURES).not.toContain("tagInvalidation");
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
