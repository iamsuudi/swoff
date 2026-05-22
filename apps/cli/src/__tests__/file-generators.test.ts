import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { defaultConfig, type SwoffConfig } from "../lib/shared/config-types.js";
import type { GeneratorContext } from "../lib/generators/file-generators/context.js";

import { generateSwTemplate } from "../lib/generators/file-generators/sw-template.js";
import { generateSwInjector } from "../lib/generators/file-generators/sw-injector.js";
import { generateFetchWrapper } from "../lib/generators/file-generators/fetch-wrapper.js";
import { generateCache } from "../lib/generators/file-generators/cache.js";
import { generateStore } from "../lib/generators/file-generators/store.js";
import { generateMutationQueue } from "../lib/generators/file-generators/mutation-queue.js";
import { generateReconcile } from "../lib/generators/file-generators/reconcile.js";
import { generateBackgroundSync } from "../lib/generators/file-generators/background-sync.js";
import { generateIndexedDB } from "../lib/generators/file-generators/indexeddb.js";
import { generatePwaInstall } from "../lib/generators/file-generators/pwa-install.js";
import { generateManifest } from "../lib/generators/file-generators/manifest.js";
import { generateInvalidationTags } from "../lib/generators/file-generators/invalidation-tags.js";
import { generateSwGeneratorBuild } from "../lib/generators/file-generators/sw-generator-build.js";
import { generateTypeDefinitions } from "../lib/generators/file-generators/type-definitions.js";

const testDir = "/tmp/swoff-test-generators";

function makeContext(overrides?: Partial<SwoffConfig>): GeneratorContext {
  const config: SwoffConfig = {
    ...defaultConfig,
    ...overrides,
    serviceWorker: { ...defaultConfig.serviceWorker, ...overrides?.serviceWorker },
    features: { ...defaultConfig.features, ...overrides?.features },
    pwa: { ...defaultConfig.pwa, ...overrides?.pwa },
    database: { ...defaultConfig.database, ...overrides?.database },
    build: { ...defaultConfig.build, ...overrides?.build },
  };

  return {
    config,
    projectRoot: testDir,
    swoffDir: join(testDir, "swoff"),
    ext: "js",
    generatedFiles: [],
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
    const content = readFileSync(join(ctx.swoffDir, "sw-template.js"), "utf8");
    expect(content).toContain("// [[CACHE_NAME]]");
    expect(content).toContain("// [[ASSETS_LIST]]");
    expect(content).toContain("// [[AUTO_SKIP_WAITING]]");
    expect(content).toContain("CACHE_NAME_RUNTIME");
    expect(content).toContain("self.addEventListener");
    expect(content).toContain("SWOFF");
  });

  it("includes SWOFF.network matching default-template.ts", () => {
    const ctx = makeContext();
    generateSwTemplate(ctx);
    const content = readFileSync(join(ctx.swoffDir, "sw-template.js"), "utf8");
    expect(content).toContain("network: {");
    expect(content).toContain("Network request failed");
  });
});

describe("generateSwInjector", () => {
  it("generates JS registration with correct config values", () => {
    const ctx = makeContext({
      serviceWorker: { ...defaultConfig.serviceWorker, autoRegister: true, autoActivate: true },
    });
    generateSwInjector(ctx);
    const content = readFileSync(join(ctx.swoffDir, "sw-injector.js"), "utf8");
    expect(content).toContain("AUTO_REGISTER = true");
    expect(content).toContain("AUTO_ACTIVATE = true");
    expect(content).toContain("initServiceWorker");
    expect(content).not.toContain("shouldRegisterSW");
    expect(content).toContain("shouldRegister");
    expect(content).toContain("handleUpdateApproved");
    expect(content).toContain("skipWaiting");
  });

  it("generates TS when ext is ts", () => {
    const ctx = makeContext();
    ctx.ext = "ts";
    generateSwInjector(ctx);
    expect(existsSync(join(ctx.swoffDir, "sw-injector.ts"))).toBe(true);
  });

  it("reflects autoRegister false", () => {
    const ctx = makeContext({
      serviceWorker: { ...defaultConfig.serviceWorker, autoRegister: false },
    });
    generateSwInjector(ctx);
    const content = readFileSync(join(ctx.swoffDir, "sw-injector.js"), "utf8");
    expect(content).toContain("AUTO_REGISTER = false");
  });
});

describe("generateFetchWrapper", () => {
  it("exports fetchWithCache and fetchWithCacheOrQueue", () => {
    const ctx = makeContext();
    generateFetchWrapper(ctx);
    const content = readFileSync(join(ctx.swoffDir, "fetch-wrapper.js"), "utf8");
    expect(content).toContain("fetchWithCache");
    expect(content).toContain("fetchWithCacheOrQueue");
    expect(content).toContain("inFlightRequests");
    expect(content).toContain("X-SW-Cache-Strategy");
    expect(content).toContain("X-SW-Stale");
    expect(content).toContain("X-SW-Cache-Tags");
  });
});

describe("generateCache", () => {
  it("exports cache invalidation functions", () => {
    const ctx = makeContext();
    generateCache(ctx);
    const content = readFileSync(join(ctx.swoffDir, "cache.js"), "utf8");
    expect(content).toContain("invalidateByTag");
    expect(content).toContain("invalidateByTags");
    expect(content).toContain("initCrossTabSync");
    expect(content).toContain("INVALIDATE_TAG");
    expect(content).toContain("TAG_INVALIDATED");
  });
});

describe("generateStore", () => {
  it("uses database name from config", () => {
    const ctx = makeContext({ database: { name: "my-custom-db", stores: [] } });
    generateStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "store.js"), "utf8");
    expect(content).toContain('DB_NAME = "my-custom-db"');
    expect(content).toContain("openAppDB");
    expect(content).toContain("getRecord");
    expect(content).toContain("putRecord");
    expect(content).toContain("deleteRecord");
    expect(content).toContain("getAllRecords");
  });

  it("defaults to app-db", () => {
    const ctx = makeContext();
    generateStore(ctx);
    const content = readFileSync(join(ctx.swoffDir, "store.js"), "utf8");
    expect(content).toContain('DB_NAME = "app-db"');
  });
});

describe("generateMutationQueue", () => {
  it("contains mutation queue functions", () => {
    const ctx = makeContext();
    generateMutationQueue(ctx);
    const content = readFileSync(join(ctx.swoffDir, "mutation-queue.js"), "utf8");
    expect(content).toContain("queueMutation");
    expect(content).toContain("processMutationQueue");
    expect(content).toContain("getPendingCount");
    expect(content).toContain("rollbackMutation");
    expect(content).toContain("reconcileRecord");
    expect(content).toContain("MAX_RETRIES");
    expect(content).toContain("swoff-queue");
    expect(content).toContain("window.addEventListener(\"online\", processMutationQueue)");
  });
});

describe("generateReconcile", () => {
  it("exports reconcileRecord and reconcileReferences", () => {
    const ctx = makeContext();
    generateReconcile(ctx);
    const content = readFileSync(join(ctx.swoffDir, "reconcile.js"), "utf8");
    expect(content).toContain("reconcileRecord");
    expect(content).toContain("reconcileReferences");
    expect(content).toContain("$synced");
  });
});

describe("generateBackgroundSync", () => {
  it("contains background sync utilities", () => {
    const ctx = makeContext();
    generateBackgroundSync(ctx);
    const content = readFileSync(join(ctx.swoffDir, "background-sync.js"), "utf8");
    expect(content).toContain("syncWhenPossible");
    expect(content).toContain("retrySync");
    expect(content).toContain("SYNC_TAG");
    expect(content).toContain("SyncManager");
    expect(content).toContain("sync-mutations");
  });
});

describe("generateIndexedDB", () => {
  it("uses database name from config", () => {
    const ctx = makeContext({
      database: { name: "custom-db", stores: ["todos", "users"] },
    });
    generateIndexedDB(ctx);
    const content = readFileSync(join(ctx.swoffDir, "indexeddb.js"), "utf8");
    expect(content).toContain('DB_NAME = "custom-db"');
    expect(content).toContain("todos");
    expect(content).toContain("users");
    expect(content).toContain("requestPersistentStorage");
    expect(content).toContain("monitorStorage");
  });

  it("generates placeholder when no stores configured", () => {
    const ctx = makeContext();
    generateIndexedDB(ctx);
    const content = readFileSync(join(ctx.swoffDir, "indexeddb.js"), "utf8");
    expect(content).toContain("// Create your object stores here:");
  });
});

describe("generatePwaInstall", () => {
  it("generates with correct preventDefault setting", () => {
    const ctx = makeContext({ pwa: { preventDefaultInstall: true } });
    generatePwaInstall(ctx);
    const content = readFileSync(join(ctx.swoffDir, "pwa-install.js"), "utf8");
    expect(content).toContain("PREVENT_DEFAULT_INSTALL = true");
    expect(content).toContain("beforeinstallprompt");
    expect(content).toContain("promptInstall");
    expect(content).toContain("isInstallable");
  });

  it("generates with preventDefault false", () => {
    const ctx = makeContext({ pwa: { preventDefaultInstall: false } });
    generatePwaInstall(ctx);
    const content = readFileSync(join(ctx.swoffDir, "pwa-install.js"), "utf8");
    expect(content).toContain("PREVENT_DEFAULT_INSTALL = false");
  });
});

describe("generateManifest", () => {
  it("creates manifest.json when public/ exists and no existing manifest", () => {
    const ctx = makeContext();
    mkdirSync(join(ctx.projectRoot, "public"), { recursive: true });
    generateManifest(ctx);
    const manifestPath = join(ctx.projectRoot, "public", "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.name).toBeDefined();
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.display).toBe("standalone");
    expect(manifest.orientation).toBe("portrait-primary");
    expect(manifest.scope).toBe("/");
    expect(manifest.lang).toBe("en-US");
    expect(manifest.categories).toEqual(["utilities", "web"]);
    expect(manifest.prefer_related_applications).toBe(false);
    expect(manifest.display_override).toContain("window-controls-overlay");
    expect(ctx.generatedFiles).toContain("public/manifest.json");
  });

  it("skips when public/ directory is missing", () => {
    const ctx = makeContext();
    generateManifest(ctx);
    expect(ctx.generatedFiles).not.toContain("public/manifest.json");
  });

  it("skips when manifest.json already exists", () => {
    const ctx = makeContext();
    mkdirSync(join(ctx.projectRoot, "public"), { recursive: true });
    const manifestPath = join(ctx.projectRoot, "public", "manifest.json");
    writeFileSync(manifestPath, JSON.stringify({ name: "Custom" }));
    generateManifest(ctx);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.name).toBe("Custom");
    expect(ctx.generatedFiles).not.toContain("public/manifest.json");
  });
});

describe("generateInvalidationTags", () => {
  it("exports tag generation functions", () => {
    const ctx = makeContext();
    generateInvalidationTags(ctx);
    const content = readFileSync(join(ctx.swoffDir, "invalidation-tags.js"), "utf8");
    expect(content).toContain("generateTags");
    expect(content).toContain("generateTagsFromMethod");
    expect(content).toContain("invalidateUrl");
    expect(content).toContain("invalidateByMethod");
  });
});

describe("generateSwGeneratorBuild", () => {
  it("generates build script with correct imports", () => {
    const ctx = makeContext();
    generateSwGeneratorBuild(ctx);
    const content = readFileSync(join(ctx.swoffDir, "sw-generator.js"), "utf8");
    expect(content).toContain("#!/usr/bin/env node");
    expect(content).toContain("readFileSync");
    expect(content).toContain("writeFileSync");
    expect(content).toContain("mkdirSync");
    expect(content).toContain("sw-template.js");
    expect(content).toContain("version.json");
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
    expect(content).toContain("SWOFFCache");
    expect(content).toContain("SWOFF");
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
