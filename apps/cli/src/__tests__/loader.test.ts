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
  });

  it("loads JSON config", () => {
    const config = {
      enabled: true,
      features: {
        serviceWorker: {
          autoActivate: true,
          strategy: { default: "network-first", patterns: {} },
        },
        mutationQueue: {
          enabled: true,
          batchSize: 1,
          batchDelayMs: 0,
          retry: { maxRetries: 5, backoffMs: 1000, maxBackoffMs: 30000, jitterMs: 250 },
        },
        pwa: { enabled: true, preventDefaultInstall: true },
        auth: {
          enabled: false,
          type: "bearer",
        },
        tagInvalidation: {},
      },
      build: { swOutput: "build" },
    };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));

    const result = loadConfig(testDir);
    expect(result.configPath).toContain("swoff.config.json");
    expect(result.configSource).toBe("JSON");
    expect(result.config.build.swOutput).toBe("build");
  });

  it("merges user config with defaults", () => {
    const config = { features: { serviceWorker: { autoActivate: true } } };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));

    const result = loadConfig(testDir);
    expect(result.config.features.serviceWorker.autoActivate).toBe(true);
  });

  it("prefers JSON over JS config", () => {
    const jsonConfig = {
      features: { serviceWorker: { autoActivate: true } },
    };
    writeFileSync(
      join(testDir, "swoff.config.json"),
      JSON.stringify(jsonConfig),
    );

    const result = loadConfig(testDir);
    expect(result.config.features.serviceWorker.autoActivate).toBe(true);
    expect(result.configSource).toBe("JSON");
  });

  it("uses explicit path when provided", () => {
    const customPath = join(testDir, "custom-config.json");
    const config = { features: { serviceWorker: { autoActivate: true } } };
    writeFileSync(customPath, JSON.stringify(config));

    const result = loadConfig(testDir, customPath);
    expect(result.configPath).toBe(customPath);
    expect(result.config.features.serviceWorker.autoActivate).toBe(true);
  });

  it("falls back to defaults on invalid JSON", () => {
    writeFileSync(join(testDir, "swoff.config.json"), "{ invalid json }");

    const result = loadConfig(testDir);
    expect(result.configSource).toBe("defaults");
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
