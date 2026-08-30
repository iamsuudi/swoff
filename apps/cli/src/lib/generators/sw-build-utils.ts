import { readdirSync, existsSync } from "fs";
import { join, relative, extname } from "path";
import type { PrecacheDirConfig, SwoffConfig } from "../shared/config-types.js";

export function collectAssets(dir: string, baseDir: string, excludeDirs?: string[]): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const assets: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs?.includes(entry.name)) continue;
      assets.push(...collectAssets(fullPath, baseDir, excludeDirs));
    } else {
      assets.push("/" + relative(baseDir, fullPath));
    }
  }
  return assets;
}

export function buildFallbackList(config: SwoffConfig): string[] {
  const fallback: string[] = [];
  if (config.features.pwa.enabled) fallback.push("/manifest.json");

  const nav = config.features.caching.navigation;
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
  }

  return fallback;
}

export function scanPrecacheAssets(
  config: SwoffConfig,
  projectRoot: string,
  swFile: string,
): string[] {
  const dirsRaw = config.build.precacheDirs || {};
  const dirs = dirsRaw;
  const scanned: string[] = [];
  for (const [dir, raw] of Object.entries(dirs)) {
    const dirPath = join(projectRoot, dir);
    const cfg = raw as PrecacheDirConfig;
    const normPrefix = cfg.prefix.replace(/\/+$/, "");
    for (const a of collectAssets(dirPath, dirPath, cfg.excludeDirs)) {
      if (cfg.matchExtensions?.length && !cfg.matchExtensions.includes(extname(a))) continue;
      if (cfg.excludeFiles?.length) {
        const basename = a.split("/").pop() || "";
        let excluded = false;
        for (const pat of cfg.excludeFiles) {
          if (pat.startsWith("*.") ? basename.endsWith(pat.slice(1)) : basename === pat) {
            excluded = true;
            break;
          }
        }
        if (excluded) continue;
      }
      let urlPath = normPrefix + "/" + a.slice(1);
      if (cfg.stripExtensions?.includes(extname(a))) {
        urlPath = urlPath.replace(/\.[^/.]+$/, "");
      }
      if (cfg.stripSuffixes) {
        for (const suffix of cfg.stripSuffixes) {
          if (urlPath.endsWith("/" + suffix)) {
            urlPath = urlPath.slice(0, -suffix.length - 1) + "/";
          }
        }
      }
      if (urlPath !== "/" && urlPath.endsWith("/")) {
        urlPath = urlPath.slice(0, -1);
      }
      if (urlPath !== `/${swFile}`)
        scanned.push(urlPath);
    }
  }
  return scanned;
}
