import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { defaultConfig, type SwoffConfig } from "../lib/shared/config-types.js";
import type { GeneratorContext } from "../lib/generators/file-generators/context.js";

import { generateSwTemplate } from "../lib/generators/file-generators/sw-template.js";
import { generateSwInjector } from "../lib/generators/file-generators/sw-injector.js";
import { generateClientInjector } from "../lib/generators/file-generators/client-injector.js";
import { generateFetchWrapper } from "../lib/generators/file-generators/fetch-wrapper.js";
import { generateCache } from "../lib/generators/file-generators/cache.js";
import { generateMutationQueue } from "../lib/generators/file-generators/mutation-queue.js";
import { generateBackgroundSync } from "../lib/generators/file-generators/background-sync.js";
import { generateSwGeneratorBuild } from "../lib/generators/file-generators/sw-generator-build.js";
import { generateTypeDefinitions } from "../lib/generators/file-generators/type-definitions.js";
import { generateAuthCheck } from "../lib/generators/file-generators/auth-check.js";

const testDir = "/tmp/swoff-test-generators";

function makeContext(overrides?: Partial<SwoffConfig>): GeneratorContext {
  const config: SwoffConfig = {
    ...defaultConfig,
    ...overrides,
    features: {
      ...defaultConfig.features,
      ...overrides?.features,
      pwa: { ...defaultConfig.features.pwa, ...overrides?.features?.pwa },
      serviceWorker: {
        ...defaultConfig.features.serviceWorker,
        ...overrides?.features?.serviceWorker,
      },
    },
    build: { ...defaultConfig.build, ...overrides?.build },
  };

  return {
    config,
    projectRoot: testDir,
    swoffDir: join(testDir, "swoff"),
    ext: "js",
    generatedFiles: [],
    frameworkName: "vanilla",
  };
}

beforeEach(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true });
});

describe("generateSwTemplate", () => {
  it("produces a template with placeholders", () => {
    const ctx = makeContext();
    generateSwTemplate(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "sw", "template.js"),
      "utf8",
    );
    expect(content).toContain("// [[CACHE_NAME]]");
    expect(content).toContain("// [[ASSETS_LIST]]");
    expect(content).toContain("// [[AUTO_SKIP_WAITING]]");
    expect(content).toContain("CACHE_NAME_RUNTIME");
    expect(content).toContain("CACHE_NAME_RUNTIME_HTML");
    expect(content).toContain("self.addEventListener");
    expect(content).toContain("fromPrecache");
  });

  it("includes config-driven strategy code", () => {
    const ctx = makeContext({
      features: {
        ...defaultConfig.features,
        serviceWorker: {
          ...defaultConfig.features.serviceWorker,
          strategy: {
            ...defaultConfig.features.serviceWorker.strategy,
            patterns: { "/api/*": "network-first" },
          },
        },
      },
    });
    generateSwTemplate(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "sw", "template.js"),
      "utf8",
    );
    expect(content).toContain("determineCacheStrategy");
    expect(content).toContain("fromPrecache");
    expect(content).toContain("network-first");
    expect(content).toContain("invalidateByTag");
  });
});

describe("generateSwInjector", () => {
  it("generates JS registration with correct config values", () => {
    const ctx = makeContext({
      features: {
        ...defaultConfig.features,
        serviceWorker: {
          ...defaultConfig.features.serviceWorker,
          autoActivate: true,
        },
      },
    });
    generateSwInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "sw", "injector.js"),
      "utf8",
    );
    expect(content).toContain("AUTO_ACTIVATE = true");
    expect(content).toContain("initServiceWorker");
    expect(content).toContain("skipWaiting");
    expect(content).toContain("waitForController");
  });

  it("generates TS when ext is ts", () => {
    const ctx = makeContext();
    ctx.ext = "ts";
    generateSwInjector(ctx);
    expect(existsSync(join(ctx.swoffDir, "sw", "injector.ts"))).toBe(true);
  });

  it("reflects autoActivate false", () => {
    const ctx = makeContext({
      features: {
        ...defaultConfig.features,
        serviceWorker: {
          ...defaultConfig.features.serviceWorker,
          autoActivate: false,
        },
      },
    });
    generateSwInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "sw", "injector.js"),
      "utf8",
    );
    expect(content).toContain("AUTO_ACTIVATE = false");
  });

  it("generates hash-mode injector without SW_VERSION import", () => {
    const ctx = makeContext({
      features: {
        ...defaultConfig.features,
        serviceWorker: {
          ...defaultConfig.features.serviceWorker,
          version: "hash",
        },
      },
    });
    generateSwInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "sw", "injector.js"),
      "utf8",
    );
    expect(content).not.toContain("SW_VERSION");
    expect(content).toContain("/sw.js");
  });

  it("generates AUTO_ACTIVATE = true in hash mode", () => {
    const ctx = makeContext({
      features: {
        ...defaultConfig.features,
        serviceWorker: {
          ...defaultConfig.features.serviceWorker,
          version: "hash",
          autoActivate: true,
        },
      },
    });
    generateSwInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "sw", "injector.js"),
      "utf8",
    );
    expect(content).toContain("AUTO_ACTIVATE = true");
  });
});

describe("generateClientInjector", () => {
  it("generates orchestrator with PWA setup and SW message listener when pwa enabled", () => {
    const ctx = makeContext({
      features: { ...defaultConfig.features },
    });
    generateClientInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "client-injector.js"),
      "utf8",
    );
    expect(content).toContain("initServiceWorker");
    expect(content).toContain("setupPwaInstall");
    expect(content).toContain("SW_PROGRESS");
    expect(content).toContain("BACKGROUND_SYNC_COMPLETE");
  });

  it("includes TAG_INVALIDATED handler", () => {
    const ctx = makeContext({
      features: {
        ...defaultConfig.features,
        tagInvalidation: {
          ...defaultConfig.features.tagInvalidation,
          crossTabSync: true,
        },
      },
    });
    generateClientInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "client-injector.js"),
      "utf8",
    );
    expect(content).toContain("TAG_INVALIDATED");
    expect(content).toContain('"cache-invalidated"');
  });

  it("includes setupPwaInstall and beforeinstallprompt import when pwa enabled", () => {
    const ctx = makeContext({
      features: { ...defaultConfig.features },
    });
    generateClientInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "client-injector.js"),
      "utf8",
    );
    expect(content).toContain("setupPwaInstall");
    expect(content).toContain("./pwa/injector");
  });

  it("always imports sw/injector", () => {
    const ctx = makeContext({
      features: {
        ...defaultConfig.features,
        pwa: { ...defaultConfig.features.pwa, enabled: true },
      },
    });
    generateClientInjector(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "client-injector.js"),
      "utf8",
    );
    expect(content).toContain("swInit");
    expect(content).toContain("./sw/injector");
    expect(content).toContain("setupPwaInstall");
    expect(content).not.toContain("No SW registration configured");
  });
});

describe("generateFetchWrapper", () => {
  it("exports fetchWithCache", () => {
    const ctx = makeContext();
    generateFetchWrapper(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "fetch", "core.js"),
      "utf8",
    );
    expect(content).toContain("fetchWithCache");
  });
});

describe("generateCache", () => {
  it("exports cache invalidation functions", () => {
    const ctx = makeContext();
    generateCache(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "cache", "index.js"),
      "utf8",
    );
    expect(content).toContain("invalidateByTag");
    expect(content).toContain("invalidateByTags");
    expect(content).toContain("INVALIDATE_TAG");
    expect(content).not.toContain("initCrossTabSync");
    expect(content).not.toContain("TAG_INVALIDATED");
  });
});

describe("generateMutationQueue", () => {
  it("contains mutation queue functions", () => {
    const ctx = makeContext();
    generateMutationQueue(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "mutation", "queue.js"),
      "utf8",
    );
    expect(content).toContain("queueMutation");
    expect(content).toContain("processMutationQueue");
    expect(content).toContain("getPendingCount");
    expect(content).toContain("MAX_RETRIES");
    expect(content).toContain("swoff-queue");
  });
});

describe("generateBackgroundSync", () => {
  it("contains background sync utilities", () => {
    const ctx = makeContext();
    generateBackgroundSync(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "mutation", "sync.js"),
      "utf8",
    );
    expect(content).toContain("syncWhenPossible");
    expect(content).toContain("retrySync");
    expect(content).toContain("SYNC_TAG");
    expect(content).toContain("SyncManager");
    expect(content).toContain("sync-mutations");
  });
});

describe("generateSwGeneratorBuild", () => {
  it("generates build script with correct imports", () => {
    const ctx = makeContext();
    generateSwGeneratorBuild(ctx);
    const content = readFileSync(
      join(ctx.swoffDir, "sw", "generator.js"),
      "utf8",
    );
    expect(content).toContain("#!/usr/bin/env node");
    expect(content).toContain("readFileSync");
    expect(content).toContain("writeFileSync");
    expect(content).toContain("mkdirSync");
    expect(content).toContain("template.js");
    expect(content).toContain("createHash");
    expect(content).not.toContain("import('fs').then");
  });
});

describe("generateTypeDefinitions", () => {
  it("generates type declarations when ext is ts", () => {
    const ctx = makeContext();
    ctx.ext = "ts";
    generateTypeDefinitions(ctx);
    const content = readFileSync(join(ctx.swoffDir, "swoff.d.ts"), "utf8");
    expect(content).toContain("BeforeInstallPromptEvent");
    expect(content).toContain("FetchWithCacheOptions");
    expect(content).toContain("MutationQueueItem");
    expect(content).toContain("MutationQueueResult");
  });

  it("skips generation when ext is js", () => {
    const ctx = makeContext();
    generateTypeDefinitions(ctx);
    expect(ctx.generatedFiles).not.toContain("swoff/swoff.d.ts");
  });
});

describe("generateAuthCheck", () => {
  it("creates sw/auth-check.js with default isAuthFailureResponse", () => {
    const ctx = makeContext();
    generateAuthCheck(ctx);
    const content = readFileSync(join(ctx.swoffDir, "sw", "auth-check.js"), "utf8");
    expect(content).toContain("isAuthFailureResponse");
    expect(content).toContain("return response.status === 401");
  });

  it("creates sw/auth-check.ts with type annotations when ext is ts", () => {
    const ctx = makeContext();
    ctx.ext = "ts";
    generateAuthCheck(ctx);
    const content = readFileSync(join(ctx.swoffDir, "sw", "auth-check.ts"), "utf8");
    expect(content).toContain(": Response");
    expect(content).toContain("Promise<boolean>");
  });
});
