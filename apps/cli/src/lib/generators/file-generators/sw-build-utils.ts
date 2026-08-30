import { GeneratorContext, writeFile } from "./context.js";

export function generateSwBuildUtils(ctx: GeneratorContext): void {
  const code = `/**
 * Swoff SW Build Utilities
 * Shared functions used by generator.mjs at build time.
 */

import { readdirSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

export function collectAssets(dir, baseDir, excludeDirs) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const assets = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs && excludeDirs.indexOf(entry.name) !== -1) continue;
      assets.push(...collectAssets(fullPath, baseDir, excludeDirs));
    } else {
      assets.push('/' + relative(baseDir, fullPath));
    }
  }
  return assets;
}

export function buildFallbackList(config) {
  const fallback = [];
  if (config.features?.pwa?.enabled) fallback.push('/manifest.json');
  const nav = config.features?.caching?.navigation || {};
  if (nav.fallback && fallback.indexOf(nav.fallback) === -1) {
    fallback.push(nav.fallback);
  }
  if (nav.precacheRoutes) {
    for (const route of nav.precacheRoutes) {
      if (fallback.indexOf(route) === -1) fallback.push(route);
    }
  }
  if (nav.rules) {
    for (const rule of nav.rules) {
      if (rule.fallback && fallback.indexOf(rule.fallback) === -1) {
        fallback.push(rule.fallback);
      }
    }
  }
  return fallback;
}

export function scanPrecacheAssets(config, projectRoot, swFile) {
  const dirs = config.build?.precacheDirs || {};
  const scanned = [];
  for (const [dir, cfg] of Object.entries(dirs)) {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) continue;
    const normPrefix = cfg.prefix.replace(/\\/+$/, '');
    for (const a of collectAssets(dirPath, dirPath, cfg.excludeDirs)) {
      if (cfg.matchExtensions?.length && cfg.matchExtensions.indexOf(extname(a)) === -1) continue;
      if (cfg.excludeFiles?.length) {
        const basename = a.split('/').pop() || '';
        let excluded = false;
        for (const pat of cfg.excludeFiles) {
          if (pat.startsWith('*.') ? basename.endsWith(pat.slice(1)) : basename === pat) {
            excluded = true;
            break;
          }
        }
        if (excluded) continue;
      }
      let url = normPrefix + '/' + a.slice(1);
      if (cfg.stripExtensions?.indexOf(extname(a)) !== -1) {
        url = url.replace(/\\.[^/.]+$/, '');
      }
      if (cfg.stripSuffixes) {
        for (const suffix of cfg.stripSuffixes) {
          if (url.endsWith('/' + suffix)) {
            url = url.slice(0, -suffix.length - 1) + '/';
          }
        }
      }
      if (url !== '/' && url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      if (url !== '/' + swFile) {
        scanned.push(url);
      }
    }
  }
  return scanned;
}
`;

  writeFile(ctx, "sw/build-utils.mjs", code);
}
