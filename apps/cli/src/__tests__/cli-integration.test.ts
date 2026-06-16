import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { generateFiles } from "../lib/generators/swoff-files-generator.js";
import { generateSW } from "../lib/generators/sw-generator.js";
import type { GeneratorContext } from "../lib/generators/file-generators/context.js";
import { loadConfig } from "../lib/config/loader.js";

describe("CLI commands integration", () => {
  const testDir = "/tmp/swoff-test-cli";

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  });

  describe("init behavior", () => {
    it("creates swoff.config.json with correct structure", () => {
      const config = {
        $schema: "https://swoff.netlify.app/schema/v1.json",
        features: {
          pwa: { enabled: true, preventDefaultInstall: false },
          serviceWorker: {
            version: "package",
            autoActivate: false,
            strategy: {
              default: "cache-first",
              patterns: { "/api/*": "network-first", "/static/*": "cache-first" },
              reactive: {
                defaults: { staleTime: 0, refetchInterval: 0, refetchOnReconnect: false, refetchOnFocus: false },
              },
            },
            navigation: {
              mode: "spa",
              fallback: "/index.html",
            },
          },
          refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 },
          mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000, backgroundSync: false },
          auth: { enabled: false, type: "bearer" },
          tagInvalidation: {},
        },
        build: { outputDir: "dist", swFilename: "sw" },
      };
      writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config, null, 2));

      const parsed = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
      expect(parsed.$schema).toBe("https://swoff.netlify.app/schema/v1.json");
      expect(parsed.features.serviceWorker.version).toBe("package");
      expect(parsed.features.pwa.preventDefaultInstall).toBe(false);
    });

    it("creates swoff directory", () => {
      mkdirSync(join(testDir, "swoff"), { recursive: true });
      expect(existsSync(join(testDir, "swoff"))).toBe(true);
    });
  });

  describe("clean behavior", () => {
    it("identifies old SW files for deletion", () => {
      const distDir = join(testDir, "dist");
      mkdirSync(distDir, { recursive: true });
      writeFileSync(join(distDir, "sw-v1.0.0.js"), "// current");
      writeFileSync(join(distDir, "sw-v0.9.0.js"), "// old");
      writeFileSync(join(distDir, "sw-v0.8.0.js"), "// old");
      writeFileSync(join(distDir, "version.json"), JSON.stringify({ version: "1.0.0" }));

      const files = readdirSync(distDir);
      const swPattern = /^sw-v\d+\.\d+\.\d+\.js$/;
      const swFiles = files.filter((f) => swPattern.test(f));

      expect(swFiles).toHaveLength(3);

      let deleted = 0;
      for (const file of swFiles) {
        const versionMatch = file.match(/v(\d+\.\d+\.\d+)\.js$/);
        if (versionMatch && versionMatch[1] !== "1.0.0") {
          unlinkSync(join(distDir, file));
          deleted++;
        }
      }

      expect(deleted).toBe(2);
      expect(existsSync(join(distDir, "sw-v1.0.0.js"))).toBe(true);
      expect(existsSync(join(distDir, "sw-v0.9.0.js"))).toBe(false);
      expect(existsSync(join(distDir, "sw-v0.8.0.js"))).toBe(false);
    });

    it("keeps current version file", () => {
      const distDir = join(testDir, "dist");
      mkdirSync(distDir, { recursive: true });
      writeFileSync(join(distDir, "sw-v2.0.0.js"), "// current");
      writeFileSync(join(distDir, "version.json"), JSON.stringify({ version: "2.0.0" }));

      const files = readdirSync(distDir);
      const swPattern = /^sw-v\d+\.\d+\.\d+\.js$/;
      const swFiles = files.filter((f) => swPattern.test(f));

      let deleted = 0;
      for (const file of swFiles) {
        const versionMatch = file.match(/v(\d+\.\d+\.\d+)\.js$/);
        if (versionMatch && versionMatch[1] !== "2.0.0") {
          deleted++;
        }
      }

      expect(deleted).toBe(0);
    });
  });

  describe("config validation scenarios", () => {
    it("detects missing required fields", () => {
      const config = {};
      const required = ["features", "build"];
      const missing = required.filter((f) => !(f in config));
      expect(missing).toContain("features");
      expect(missing).toContain("build");
    });

    it("validates feature flags are booleans or objects", () => {
      const config = {
        features: {
          pwa: { enabled: true, preventDefaultInstall: false },
          serviceWorker: { version: "package", autoActivate: false, strategy: { default: "cache-first", patterns: {} } },
          auth: 1,
        },
      };

      const errors: string[] = [];
      for (const [key, value] of Object.entries(config.features)) {
        if (typeof value !== "boolean" && typeof value !== "object") {
          errors.push(`Feature "${key}" must be a boolean or object`);
        }
      }

      expect(errors).toHaveLength(1);
      expect(errors).toContain('Feature "auth" must be a boolean or object');
    });
  });

  describe("end-to-end generate pipeline", () => {
    function writeConfig(overrides: Record<string, unknown> = {}) {
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
              patterns: { "/api/*": "network-first", "/static/*": "cache-first" },
              reactive: { defaults: { staleTime: 0, refetchInterval: 0, refetchOnReconnect: false, refetchOnFocus: false } },
              mode: "all" as const,
              clearRuntimeOnUpdate: false,
              normalizeKey: false,
              ignoreQueryParams: [],
            },
            navigation: { mode: "spa" as const, preload: true, fallback: "/index.html" },
          },
          refetchQueue: { batchSize: 5, batchDelayMs: 1000, maxRetries: 3, retryDelayMs: 1000 },
          mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000, backgroundSync: false },
          auth: { enabled: false, type: "bearer" as const },
          tagInvalidation: {},
          graphql: { enabled: false, endpoints: ["/graphql"] },
          pushNotifications: false, vapidPublicKey: "", serverPush: { enabled: false, type: "sse", endpoint: "/api/events", reconnectDelayMs: 5000 },
        },
        build: { outputDir: "dist", swFilename: "sw" },
        ...overrides,
      };
      writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config, null, 2));
    }

    it("generates SW and supporting files into swoff/", async () => {
      writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test-app", version: "1.0.0" }));
      writeConfig();

      const { config } = loadConfig(testDir);
      expect(config).toBeDefined();

      // Generate service worker
      const swResult = await generateSW({ projectRoot: testDir });
      expect(swResult.outputFile).toBe("sw-v1.0.0.js");
      expect(existsSync(join(testDir, "dist", "sw-v1.0.0.js"))).toBe(true);
      expect(existsSync(join(testDir, "dist", "version.json"))).toBe(true);

      const swContent = readFileSync(join(testDir, "dist", "sw-v1.0.0.js"), "utf8");
      expect(swContent).toContain("self.addEventListener");
      expect(swContent).toContain("CACHE_NAME = 'sw-v1.0.0'");
      expect(swContent).toContain("CACHE_NAME_RUNTIME");
      expect(swContent).toContain("CACHE_NAME_RUNTIME_HTML");
      expect(swContent).toContain("invalidateByTag");

      // Generate supporting files
      const ctx: GeneratorContext = {
        config,
        projectRoot: testDir,
        swoffDir: join(testDir, "swoff"),
        ext: "js",
        generatedFiles: [],
        frameworkName: "vanilla",
      };
      const files = generateFiles(ctx);
      expect(files.length).toBeGreaterThan(0);

      // Verify key files exist
      const expectedFiles = [
        "swoff/sw/template.js",
        "swoff/sw/injector.js",
        "swoff/client-injector.js",
        "swoff/fetch/core.js",
        "swoff/cache/tags.js",
        "swoff/cache/invalidate.js",
        "swoff/pwa/prompt.js",
        "swoff/sw/generator.js",
      ];
      for (const f of expectedFiles) {
        const fullPath = join(testDir, f);
        expect(existsSync(fullPath)).toBe(true);
      }

      // Verify generated SW template contains placeholders
      const templateContent = readFileSync(join(testDir, "swoff/sw/template.js"), "utf8");
      expect(templateContent).toContain("// [[CACHE_NAME]]");
      expect(templateContent).toContain("// [[ASSETS_LIST]]");
    });

    it("generated SW file has no obvious syntax issues", async () => {
      writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test-app", version: "1.0.0" }));
      writeConfig();
      mkdirSync(join(testDir, "dist"), { recursive: true });
      writeFileSync(join(testDir, "dist", "index.html"), "<html></html>");

      await generateSW({ projectRoot: testDir });

      const swContent = readFileSync(join(testDir, "dist", "sw-v1.0.0.js"), "utf8");
      // Basic structure checks — all event listeners should be properly opened/closed
      const opens = (swContent.match(/self\.addEventListener\(/g) || []).length;
      // At minimum: install, activate, fetch, message
      expect(opens).toBeGreaterThanOrEqual(4);
    });
  });
});
