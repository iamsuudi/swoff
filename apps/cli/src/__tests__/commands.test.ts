import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { generateFiles } from "../lib/generators/swoff-files-generator.js";

vi.mock("@clack/prompts", () => {
  let callCount = 0;
  const mockValues: Record<string, unknown> = {
    framework: "react",
    swOutput: "dist",
    navMode: "spa",
    fallback: "/offline",
    defaultStrategy: "cache-first",
    pwaEnabled: false,
    authEnabled: false,
    mutationEnabled: false,
    tagInvalidationEnabled: false,
    graphqlEnabled: false,
    serverPushEnabled: false,
    pushNotificationsEnabled: false,
    precacheDir: "dist",
    precachePrefix: "/",
    write: true,
    shouldRemove: true,
  };
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    log: { info: vi.fn(), warn: vi.fn(), success: vi.fn() },
    isCancel: vi.fn(() => false),
    text: vi.fn(
      (opts) =>
        mockValues[
          opts.name ||
            Object.keys(mockValues).find((k) => k === opts.initialValue) ||
            ""
        ] ??
        opts.initialValue ??
        "",
    ),
    confirm: vi.fn((opts) => {
      callCount++;
      return (
        mockValues[
          opts.name ||
            Object.keys(mockValues).find((k) => {
              const v = mockValues[k];
              return typeof v === "boolean";
            }) ||
            ""
        ] ?? true
      );
    }),
    select: vi.fn((opts) => opts.initialValue || opts.options[0].value),
  };
});

import { initCommand } from "../lib/commands/init.js";
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
    await initCommand(testDir, true);
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(true);
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    expect(config.$schema).toBe("https://swoff.space/schema/v1.json");
  });

  it("skips when swoff.config.json already exists", async () => {
    writeFileSync(
      join(testDir, "swoff.config.json"),
      JSON.stringify({ enabled: true }),
    );
    await initCommand(testDir, true);
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    expect(config.$schema).toBeUndefined();
  });

  it("skips when swoff.config.js already exists", async () => {
    writeFileSync(join(testDir, "swoff.config.js"), "module.exports = {}");
    await initCommand(testDir, true);
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(false);
  });

  it("detects framework from package.json", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0" } }),
    );
    await initCommand(testDir, true);
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    expect(config.framework).toBe("react");
  });

  it("creates minimal config with only serviceWorker feature", async () => {
    await initCommand(testDir, true);
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    expect(config).toHaveProperty("build");
    expect(config).toHaveProperty("features");
    expect(config.features).toHaveProperty("serviceWorker");
    expect(config.features).not.toHaveProperty("pwa");
    expect(config.features).not.toHaveProperty("mutationQueue");
    expect(config.features).not.toHaveProperty("auth");
    expect(config.features).not.toHaveProperty("tagInvalidation");
    expect(config.features).not.toHaveProperty("connectivity");
  });
});

describe("cleanCommand", () => {
  it("does nothing when no swoff directory or config", async () => {
    await cleanCommand(testDir, { yes: true });
    expect(existsSync(join(testDir, "swoff"))).toBe(false);
  });

  it("removes swoff/ directory with --yes", async () => {
    mkdirSync(join(testDir, "swoff"), { recursive: true });
    writeFileSync(join(testDir, "swoff/test.js"), "test");
    writeFileSync(
      join(testDir, "swoff.config.json"),
      JSON.stringify({ enabled: true }),
    );
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
    writeFileSync(
      join(testDir, "swoff.config.json"),
      JSON.stringify({ enabled: true }),
    );
    await cleanCommand(testDir, { yes: true });
    expect(existsSync(join(testDir, "swoff.config.json"))).toBe(false);
  });
});

describe("generateCommand", () => {
  function writeMinimalConfig() {
    const config = {
      $schema: "https://swoff.space/schema/v1.json",
      framework: "react",
      features: {
        serviceWorker: {
          strategy: {
            default: "cache-first",
          },
          navigation: { mode: "spa", fallback: "/index.html" },
        },
      },
      build: { swOutput: "dist" },
    };
    writeFileSync(
      join(testDir, "swoff.config.json"),
      JSON.stringify(config, null, 2),
    );
  }

  it("generates core files when config exists", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );
    writeMinimalConfig();
    await generateCommand(testDir);
    expect(existsSync(join(testDir, "swoff"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/client-injector.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/sw/template.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/sw/injector.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/sw/generator.mjs"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/cache/invalidate.js"))).toBe(false);
    expect(existsSync(join(testDir, "swoff/storage.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/reset.js"))).toBe(true);
  });

  it("generates tag-invalidation files when tagInvalidation.enabled", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );
    writeMinimalConfig();
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    config.features.tagInvalidation = { enabled: true };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    await generateCommand(testDir);
    expect(existsSync(join(testDir, "swoff/cache/invalidate.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/cache/tags.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/fetch/core.js"))).toBe(true);
  });

  it("generates connectivity files when connectivity.enabled", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );
    writeMinimalConfig();
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    config.features.connectivity = { enabled: true };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    await generateCommand(testDir);
    expect(existsSync(join(testDir, "swoff/connectivity.js"))).toBe(true);
  });

  it("generates files in TypeScript when project uses TS", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );
    writeFileSync(
      join(testDir, "tsconfig.json"),
      JSON.stringify({ compilerOptions: {} }),
    );
    writeMinimalConfig();
    await generateCommand(testDir, { language: "ts" });
    expect(existsSync(join(testDir, "swoff/sw/injector.ts"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/storage.ts"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/swoff.d.ts"))).toBe(true);
  });

  it("warns when no config file exists", async () => {
    const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await generateCommand(testDir);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("generates db and connectivity when auth enabled", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );
    writeMinimalConfig();
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    config.features.auth = { enabled: true, type: "cookie" };
    config.features.connectivity = { enabled: true };
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    await generateCommand(testDir);
    expect(existsSync(join(testDir, "swoff/db.js"))).toBe(true);
    expect(existsSync(join(testDir, "swoff/connectivity.js"))).toBe(true);
  });
});

describe("validateCommand", () => {
  function writeValidConfig() {
    const config = {
      framework: "vanilla",
      features: {
        serviceWorker: {
          strategy: { default: "cache-first" },
          navigation: { mode: "spa", fallback: "/index.html" },
        },
      },
      build: { swOutput: "dist" },
    };
    writeFileSync(
      join(testDir, "swoff.config.json"),
      JSON.stringify(config, null, 2),
    );
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
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    config.features.serviceWorker.autoActivate = "yes";
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand(testDir);
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(
      calls.some((c: string) => c.includes("error") || c.includes("fail")),
    ).toBe(true);
    logSpy.mockRestore();
  });

  it("reports errors for invalid framework", async () => {
    writeValidConfig();
    const config = JSON.parse(
      readFileSync(join(testDir, "swoff.config.json"), "utf8"),
    );
    config.framework = "invalid-framework";
    writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand(testDir);
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(
      calls.some((c: string) => c.includes("error") || c.includes("fail")),
    ).toBe(true);
    logSpy.mockRestore();
  });
});
