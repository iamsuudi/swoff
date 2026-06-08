import { readdirSync, existsSync } from "fs";
import { join, relative } from "path";
import { createHash } from "crypto";
import type { SwoffConfig } from "../shared/config-types.js";

export function resolveVersion(versionField: string, pkgVersion: string): string {
  if (versionField === "hash") return "0.0.0";
  if (versionField === "package") return pkgVersion || "1.0.0";
  if (versionField === "manual") return "0.0.0"; // resolved at build time from sw-version.ts
  return versionField;
}

export function isVersionEnabled(versionField: string): boolean {
  return versionField !== "hash";
}

export function collectAssets(dir: string, baseDir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const assets: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      assets.push(...collectAssets(fullPath, baseDir));
    } else {
      assets.push("/" + relative(baseDir, fullPath));
    }
  }
  return assets;
}

export function generateCacheNameFromHash(): string {
  const ts = Date.now().toString(36);
  return `sw-cache-${ts}`;
}

export function buildFallbackList(config: SwoffConfig): string[] {
  const fallback: string[] = [];
  if (config.features.pwa.enabled) fallback.push("/manifest.json");

  const nav = config.features.serviceWorker.navigation;
  if (nav.fallback && !fallback.includes(nav.fallback)) {
    fallback.push(nav.fallback);
  }

  for (const route of nav.precacheRoutes || []) {
    if (!fallback.includes(route)) fallback.push(route);
  }

  for (const rule of nav.rules || []) {
    if (rule.fallback && !fallback.includes(rule.fallback)) {
      fallback.push(rule.fallback);
    }
    if (rule.policy === "cache-first" && rule.match && !fallback.includes(rule.match)) {
      fallback.push(rule.match);
    }
  }

  return fallback;
}

export function scanPrecacheAssets(
  config: SwoffConfig,
  projectRoot: string,
  swFile: string,
): string[] {
  const outputDir = config.build.outputDir;
  const dirsRaw = config.build.precacheDirs || {};
  const dirs = Object.keys(dirsRaw).length > 0 ? dirsRaw : { [outputDir]: "/" };
  const scanned: string[] = [];
  for (const [dir, prefix] of Object.entries(dirs)) {
    const dirPath = join(projectRoot, dir);
    const normPrefix = prefix.replace(/\/+$/, "");
    for (const a of collectAssets(dirPath, dirPath)) {
      const urlPath = normPrefix + "/" + a.slice(1);
      if (urlPath !== `/${swFile}` && urlPath !== "/version.json") scanned.push(urlPath);
    }
  }
  return scanned;
}
