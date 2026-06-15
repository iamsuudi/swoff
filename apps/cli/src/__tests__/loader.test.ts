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
    expect(result.config.features.serviceWorker.version).toBe("package");
  });

  it("loads JSON config", () => {
    const config = {
      enabled: true,
      features: {
        serviceWorker: {
          version: "2.0.0",
          autoActivate: true,
          strategy: { default: "network-first", patterns: {} },
        },
        mutationQueue: {
          enabled: true,
          batchSize: 1,
          batchDelayMs: 0,
          maxRetries: 5,
          retryBackoffMs: 1000,
        },
        pwa: { enabled: true, preventDefaultInstall: true },
        auth: {
          enabled: false,
          type: "bearer",
        },
        tagInvalidation: {},
      },
      build: { outputDir: "build", swFilename: "service-worker" },
    };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));

    const result = loadConfig(testDir);
    expect(result.configPath).toContain("swoff.config.json");
    expect(result.configSource).toBe("JSON");
    expect(result.config.features.serviceWorker.version).toBe("2.0.0");
    expect(result.config.build.outputDir).toBe("build");
  });

  it("merges user config with defaults", () => {
    const config = { features: { serviceWorker: { version: "hash" } } };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));

    const result = loadConfig(testDir);
    expect(result.config.features.serviceWorker.version).toBe("hash");
    expect(result.config.features.serviceWorker.autoActivate).toBe(false); // from defaults
  });

  it("prefers JSON over JS config", () => {
    const jsonConfig = {
      features: { serviceWorker: { version: "json-version" } },
    };
    writeFileSync(
      join(testDir, "swoff.config.json"),
      JSON.stringify(jsonConfig),
    );

    const result = loadConfig(testDir);
    expect(result.config.features.serviceWorker.version).toBe("json-version");
    expect(result.configSource).toBe("JSON");
  });

  it("uses explicit path when provided", () => {
    const customPath = join(testDir, "custom-config.json");
    const config = { features: { serviceWorker: { version: "custom" } } };
    writeFileSync(customPath, JSON.stringify(config));

    const result = loadConfig(testDir, customPath);
    expect(result.configPath).toBe(customPath);
    expect(result.config.features.serviceWorker.version).toBe("custom");
  });

  it("falls back to defaults on invalid JSON", () => {
    writeFileSync(join(testDir, "swoff.config.json"), "{ invalid json }");

    const result = loadConfig(testDir);
    expect(result.configSource).toBe("defaults");
    expect(result.config.features.serviceWorker.version).toBe("package");
  });

  it("skips JS config with sync loader", () => {
    writeFileSync(
      join(testDir, "swoff.config.js"),
      "export default { enabled: true };",
    );
    const result = loadConfig(testDir);
    expect(result.configSource).toBe("defaults");
  });
});
