import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

vi.mock("readline", () => ({
  createInterface: () => ({
    question: (_q: string, cb: (a: string) => void) => cb(""),
    close: () => {},
  }),
}));

vi.mock("../lib/generators/asset-generator/generate.js", () => ({
  generateAssets: vi.fn().mockResolvedValue({
    files: ["icon-192.png", "icon-512.png"],
    warnings: [],
  }),
}));

import { initCommand } from "../lib/commands/init.js";
import { addCommand } from "../lib/commands/add.js";
import { cleanCommand } from "../lib/commands/clean.js";
import { generateAssetsCommand } from "../lib/commands/assets.js";
import { generateAssets } from "../lib/generators/asset-generator/generate.js";

const testDir = "/tmp/swoff-test-commands";

beforeEach(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  mkdirSync(testDir, { recursive: true });
  vi.clearAllMocks();
});

afterEach(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true });
});

describe("initCommand", () => {
  it("creates swoff.config.json when none exists", async () => {
    await initCommand(testDir);
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(true);
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.enabled).toBe(true);
    expect(config.$schema).toBe("https://swoff.netlify.app/schema/v1.json");
  });

  it("skips when swoff.config.json already exists", async () => {
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify({ enabled: true }));
    await initCommand(testDir);
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.$schema).toBeUndefined();
  });

  it("skips when swoff.config.js already exists", async () => {
    writeFileSync(join(testDir, "swoff.config.js"), "module.exports = {}");
    await initCommand(testDir);
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(false);
  });

  it("detects framework from package.json", async () => {
    writeFileSync(join(testDir, "package.json"), JSON.stringify({ dependencies: { react: "^18.0.0" } }));
    await initCommand(testDir);
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.framework).toBe("react");
  });

  it("accepts explicit framework argument", async () => {
    await initCommand(testDir, "vue");
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.framework).toBe("vue");
  });

  it("creates config with correct structure", async () => {
    await initCommand(testDir);
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config).toHaveProperty("enabled");
    expect(config).toHaveProperty("build");
    expect(config).toHaveProperty("features");
    expect(config.features).toHaveProperty("pwa");
    expect(config.features).toHaveProperty("serviceWorker");
    expect(config.features).toHaveProperty("mutationQueue");
    expect(config.features).toHaveProperty("auth");
    expect(config.features).toHaveProperty("crossTabSync");
    expect(config.features.pwa).toHaveProperty("assets");
  });

  it("includes configVersion in created config", async () => {
    await initCommand(testDir);
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.configVersion).toBe(1);
  });
});

describe("addCommand", () => {
  it("rejects unknown features", async () => {
    await addCommand(testDir, "unknown-feature");
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(false);
  });

  it("creates config and enables a feature", async () => {
    await addCommand(testDir, "mutation-queue");
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(true);
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.features.mutationQueue.enabled).toBe(true);
  });

  it("updates existing config with feature", async () => {
    const base = { enabled: true, features: { auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" }, mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 }, backgroundSync: false, crossTabSync: false, serviceWorker: { version: "package", minSupportedVersion: "0.0.0", autoUpdate: true, autoActivate: false, strategy: { default: "cache-first", mode: "all", clearRuntimeOnUpdate: false, patterns: {}, reactive: { defaults: {} } }, navigation: { mode: "spa", fallback: "/index.html" } }, pwa: { enabled: false, preventDefaultInstall: false }, tagInvalidation: {}, graphql: { enabled: false, endpoint: "/graphql" }, pushNotifications: { enabled: false }, serverPush: { enabled: false, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 }, refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 } }, build: { outputDir: "dist", swFilename: "sw" } };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(base));
    await addCommand(testDir, "auth");
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.features.auth.enabled).toBe(true);
    expect(config.features.backgroundSync).toBe(false);
  });

  it("normalizes feature aliases", async () => {
    await addCommand(testDir, "mutationqueue");
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.features.mutationQueue.enabled).toBe(true);
  });

  it("adds multiple features", async () => {
    await addCommand(testDir, "auth,graphql");
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.features.auth.enabled).toBe(true);
    expect(config.features.graphql.enabled).toBe(true);
  });
});

describe("cleanCommand", () => {
  it("does nothing when no swoff directory or config", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await cleanCommand(testDir, { yes: true });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("removes swoff/ directory with --yes", async () => {
    mkdirSync(join(testDir, "swoff"), { recursive: true });
    writeFileSync(join(testDir, "swoff/test.js"), "test");
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify({ enabled: true }));
    await cleanCommand(testDir, { yes: true });
    expect(existsSync(join(testDir, "swoff"))).toBe(false);
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(false);
  });

  it("removes only swoff dir when no config", async () => {
    mkdirSync(join(testDir, "swoff"), { recursive: true });
    writeFileSync(join(testDir, "swoff/test.js"), "test");
    await cleanCommand(testDir, { yes: true });
    expect(existsSync(join(testDir, "swoff"))).toBe(false);
  });

  it("removes only config when no swoff dir", async () => {
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify({ enabled: true }));
    await cleanCommand(testDir, { yes: true });
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(false);
  });
});

describe("generateAssetsCommand", () => {
  it("rejects when no source specified and no config source", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    await expect(generateAssetsCommand(testDir)).rejects.toThrow("process.exit");
    exitSpy.mockRestore();
  });

  it("uses config source as fallback when --source not provided", async () => {
    const config = {
      enabled: true,
      features: {
        pwa: { enabled: true, preventDefaultInstall: false, assets: { source: "logo.svg", outputDir: "public", themeColor: "#000", bgColor: "#fff", generated: false } },
        serviceWorker: { version: "package", minSupportedVersion: "0.0.0", autoUpdate: true, autoActivate: false, strategy: { default: "cache-first", mode: "all", clearRuntimeOnUpdate: false, patterns: {}, reactive: { defaults: {} } }, navigation: { mode: "spa", fallback: "/index.html" }, requestBatchWindowMs: 50 },
        refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 },
        mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 },
        backgroundSync: false, crossTabSync: true, tagInvalidation: {},
        auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
        graphql: { enabled: false, endpoint: "/graphql" },
        pushNotifications: { enabled: false },
        serverPush: { enabled: false, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 },
      },
      build: { outputDir: "dist", swFilename: "sw" },
    };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    writeFileSync(join(testDir, "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>');
    await generateAssetsCommand(testDir);
    expect(generateAssets).toHaveBeenCalled();
    const callArgs = (generateAssets as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.source).toContain("logo.svg");
    expect(callArgs.appleSplash).toBe(true);
  });

  it("passes --no-splash to generateAssets", async () => {
    const config = {
      enabled: true,
      features: {
        pwa: { enabled: true, preventDefaultInstall: false, assets: { source: "", outputDir: "public", themeColor: "#000", bgColor: "#fff", generated: false } },
        serviceWorker: { version: "package", minSupportedVersion: "0.0.0", autoUpdate: true, autoActivate: false, strategy: { default: "cache-first", mode: "all", clearRuntimeOnUpdate: false, patterns: {}, reactive: { defaults: {} } }, navigation: { mode: "spa", fallback: "/index.html" }, requestBatchWindowMs: 50 },
        refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 },
        mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 },
        backgroundSync: false, crossTabSync: true, tagInvalidation: {},
        auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
        graphql: { enabled: false, endpoint: "/graphql" },
        pushNotifications: { enabled: false },
        serverPush: { enabled: false, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 },
      },
      build: { outputDir: "dist", swFilename: "sw" },
    };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    writeFileSync(join(testDir, "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>');
    await generateAssetsCommand(testDir, { source: join(testDir, "logo.svg"), noSplash: true });
    expect(generateAssets).toHaveBeenCalled();
    const callArgs = (generateAssets as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.appleSplash).toBe(false);
  });
});
