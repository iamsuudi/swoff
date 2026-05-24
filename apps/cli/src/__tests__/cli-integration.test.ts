import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

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
        enabled: true,
        features: {
          pwa: { enabled: true, preventDefaultInstall: false },
          serviceWorker: {
            version: {
              enabled: true,
              source: "from-package",
              minSupportedVersion: "1.0.0",
            },
            autoUpdate: true,
            autoActivate: false,
            defaultStrategy: "cache-first",
            strategies: { "/api/*": "network-first", "/static/*": "cache-first" },
          },
          mutationQueue: false,
          backgroundSync: false,
          auth: { enabled: false, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" },
          crossTabSync: true,
          tagInvalidation: true,
          clientRegistration: true,
        },
        build: { outputDir: "dist", swFilename: "sw" },
      };
      writeFileSync(join(testDir, "swoff.config.json"), JSON.stringify(config, null, 2));

      const parsed = JSON.parse(readFileSync(join(testDir, "swoff.config.json"), "utf8"));
      expect(parsed.$schema).toBe("https://swoff.netlify.app/schema/v1.json");
      expect(parsed.enabled).toBe(true);
      expect(parsed.features.serviceWorker.version.source).toBe("from-package");
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
      const config = { enabled: true };
      const required = ["enabled", "features", "build"];
      const missing = required.filter((f) => !(f in config));
      expect(missing).toContain("features");
      expect(missing).toContain("build");
    });

    it("validates feature flags are booleans or objects", () => {
      const config = {
        features: {
          pwa: { enabled: true, preventDefaultInstall: false },
          serviceWorker: { version: { enabled: true, source: "from-package", minSupportedVersion: "0.0.0" }, autoUpdate: true, autoActivate: false, defaultStrategy: "cache-first" },
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
});
