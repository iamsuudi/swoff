import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { generateFiles } from "../lib/generators/swoff-files-generator.js";

vi.mock("readline", () => ({
  createInterface: () => ({
    question: (_q: string, cb: (a: string) => void) => cb(""),
    close: () => {},
  }),
}));

import { initCommand } from "../lib/commands/init.js";
import { addCommand } from "../lib/commands/add.js";
import { cleanCommand } from "../lib/commands/clean.js";
import { generateCommand } from "../lib/commands/generate.js";
import { validateCommand } from "../lib/commands/validate.js";

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
    expect(config.framework).toBe("react-spa");
  });

  it("accepts explicit framework argument", async () => {
    await initCommand(testDir, "vue");
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.framework).toBe("vue");
  });

  it("creates config with correct structure", async () => {
    await initCommand(testDir);
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config).toHaveProperty("build");
    expect(config).toHaveProperty("features");
    expect(config.features).toHaveProperty("pwa");
    expect(config.features).toHaveProperty("serviceWorker");
    expect(config.features).toHaveProperty("mutationQueue");
    expect(config.features).toHaveProperty("auth");
    expect(config.features).toHaveProperty("tagInvalidation");
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
    const base = { features: { auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" }, mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 }, serviceWorker: { version: "package",  autoActivate: false, strategy: { default: "cache-first", mode: "all", clearRuntimeOnUpdate: false, patterns: {}, reactive: { defaults: {} } }, navigation: { mode: "spa", fallback: "/index.html" } }, pwa: { enabled: false, preventDefaultInstall: false }, tagInvalidation: { crossTabSync: false }, graphql: { enabled: false, endpoints: ["/graphql"] }, realtime: { pushNotifications: false, serverPush: { enabled: false, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 } }, refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 } }, build: { outputDir: "dist", swFilename: "sw" } };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(base));
    await addCommand(testDir, "auth");
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    expect(config.features.auth.enabled).toBe(true);
    expect(config.features.mutationQueue.backgroundSync).toBe(false);
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

describe("generateCommand", () => {
  function writeDefaultConfig() {
    const config = {
      $schema: "https://swoff.netlify.app/schema/v1.json",
      framework: "vanilla",
      features: {
        pwa: { enabled: true, preventDefaultInstall: false },
        serviceWorker: {
          version: "package",
          autoActivate: false,
          strategy: {
            default: "cache-first",
            patterns: {},
            mode: "all",
            clearRuntimeOnUpdate: false,
            reactive: { defaults: {} },
          },
          navigation: { mode: "spa", fallback: "/index.html" },
        },
        refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 },
        mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000, backgroundSync: false },
        auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
        tagInvalidation: { crossTabSync: false },
        realtime: { pushNotifications: false, serverPush: { enabled: false, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 } },
      },
      build: { outputDir: "dist", swFilename: "sw" },
    };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config, null, 2));
  }

  it("generates files when config exists", async () => {
    writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));
    writeDefaultConfig();
    await generateCommand(testDir);
    expect(existsSync(join(testDir, "swoff"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/config.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/cache/index.js"))).toBe(true);
  });

  it("generates files in TypeScript when project uses TS", async () => {
    writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));
    writeFileSync(join(testDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    writeDefaultConfig();
    await generateCommand(testDir, { language: "ts" });
    expect(existsSync(join(testDir, "swoff/config.ts"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/swoff.d.ts"))).toBe(true);
  });

  it("warns when no config file exists", async () => {
    const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await generateCommand(testDir);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("feature-gates storage when push disabled", async () => {
    writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));
    writeDefaultConfig();
    await generateCommand(testDir);
    expect(existsSync(join(testDir, "swoff/storage-notify.js"))).toBe(false);
  });

  it("generates storage when push enabled", async () => {
    writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));
    writeDefaultConfig();
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    config.features.realtime.pushNotifications = true;
    config.features.realtime.vapidPublicKey = "test-key";
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    await generateCommand(testDir);
    expect(existsSync(join(testDir, "swoff/storage-notify.js"))).toBe(true);
  });
});

describe("validateCommand", () => {
  function writeValidConfig() {
    const config = {
      framework: "vanilla",
      features: {
        pwa: { enabled: false, preventDefaultInstall: false },
        serviceWorker: {
          version: "package",
          autoActivate: false,
          strategy: {
            default: "cache-first",
            patterns: {},
            mode: "all",
            clearRuntimeOnUpdate: false,
            reactive: { defaults: {} },
          },
          navigation: { mode: "spa", fallback: "/index.html" },
        },
        refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 },
        mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000, backgroundSync: false },
        auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
        tagInvalidation: { crossTabSync: false },
        graphql: { enabled: false, endpoints: ["/graphql"] },
        realtime: { pushNotifications: false, serverPush: { enabled: false, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 } },
      },
      build: { outputDir: "dist", swFilename: "sw" },
    };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config, null, 2));
  }

  it("passes valid config", async () => {
    writeValidConfig();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand(testDir);
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: string) => c.includes("valid"))).toBe(true);
    logSpy.mockRestore();
  });

  it("warns when no config file exists", async () => {
    const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand(testDir);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("reports errors for invalid config", async () => {
    writeValidConfig();
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    config.features.serviceWorker.version = 123;
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand(testDir);
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: string) => c.includes("error") || c.includes("fail"))).toBe(true);
    logSpy.mockRestore();
  });

  it("reports errors for invalid framework", async () => {
    writeValidConfig();
    const config = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
    config.framework = "invalid-framework";
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand(testDir);
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: string) => c.includes("error") || c.includes("fail"))).toBe(true);
    logSpy.mockRestore();
  });
});
