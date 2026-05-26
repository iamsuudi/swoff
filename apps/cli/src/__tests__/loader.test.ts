import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../lib/config/loader.js";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

describe("loadConfig", () => {
  const testDir = "/tmp/swoff-test-loader";

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  });

  it("returns defaults when no config exists", () => {
    const result = loadConfig(testDir);
    expect(result.config).toBeDefined();
    expect(result.configPath).toBeNull();
    expect(result.configSource).toBe("defaults");
    expect(result.config.enabled).toBe(true);
    expect(result.config.features.serviceWorker.version.source).toBe("from-package");
  });

  it("loads JSON config", () => {
    const config = {
      enabled: true,
      features: {
        serviceWorker: { version: { enabled: true, source: "manual", value: "2.0.0" }, autoUpdate: false, autoActivate: true, defaultStrategy: "network-first", strategies: {} },
        mutationQueue: true,
        backgroundSync: false, pwa: { enabled: true, preventDefaultInstall: true }, auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
        crossTabSync: true, tagInvalidation: true,
      },
      build: { outputDir: "build", swFilename: "service-worker" },
    };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));

    const result = loadConfig(testDir);
    expect(result.configPath).toContain("swoff.config.json");
    expect(result.configSource).toBe("JSON");
    expect(result.config.features.serviceWorker.version.value).toBe("2.0.0");
    expect(result.config.features.serviceWorker.autoUpdate).toBe(false);
    expect(result.config.build.outputDir).toBe("build");
  });

  it("merges user config with defaults", () => {
    const config = { features: { serviceWorker: { version: { source: "manual", value: "3.0.0" } } } };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));

    const result = loadConfig(testDir);
    expect(result.config.features.serviceWorker.version.value).toBe("3.0.0");
    expect(result.config.enabled).toBe(true); // from defaults
    expect(result.config.features.serviceWorker.autoUpdate).toBe(true); // from defaults
  });

  it("prefers JSON over JS config", () => {
    const jsonConfig = { features: { serviceWorker: { version: { source: "manual", value: "json-version" } } } };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(jsonConfig));

    const result = loadConfig(testDir);
    expect(result.config.features.serviceWorker.version.value).toBe("json-version");
    expect(result.configSource).toBe("JSON");
  });

  it("uses explicit path when provided", () => {
    const customPath = join(testDir, "custom-config.json");
    const config = { features: { serviceWorker: { version: { source: "manual", value: "custom" } } } };
    writeFileSync(customPath, JSON.stringify(config));

    const result = loadConfig(testDir, customPath);
    expect(result.configPath).toBe(customPath);
    expect(result.config.features.serviceWorker.version.value).toBe("custom");
  });

  it("falls back to defaults on invalid JSON", () => {
    writeFileSync(join(testDir, "swoff.config.json"), "{ invalid json }");

    const result = loadConfig(testDir);
    expect(result.configSource).toBe("defaults");
    expect(result.config.features.serviceWorker.version.source).toBe("from-package");
  });
});
