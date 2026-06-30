#!/usr/bin/env node
/**
 * Swoff SW Generator Build Script
 * Reads swoff/sw/template.js and generates the final SW output.
 *
 * Add to package.json:
 *   "build": "your-build && node swoff/sw/generator.js"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();

const templatePath = join(__dirname, 'template.js');
const configPath = join(projectRoot, 'swoff.config.json');

if (!existsSync(configPath)) {
  console.error('Error: swoff.config.json not found');
  console.log('Run "npx @swoff/cli init" to create one');
  process.exit(1);
}

if (!existsSync(templatePath)) {
  console.error('Error: swoff/sw/template.js not found');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
let template = readFileSync(templatePath, 'utf8');

const swoffDir = join(projectRoot, 'swoff');

// Prepend isAuthFailureResponse from user's auth/check, or use default fallback
const authCheckTsPath = join(swoffDir, 'auth', 'check.ts');
const authCheckJsPath = join(swoffDir, 'auth', 'check.js');
const authCheckPath = existsSync(authCheckTsPath) ? authCheckTsPath : authCheckJsPath;
let authFailureFn = 'async function isAuthFailureResponse(response) {\n  return response.status === 401;\n}';
if (existsSync(authCheckPath)) {
  const authContent = readFileSync(authCheckPath, 'utf8');
  const fnMatch = authContent.match(/export\s+async\s+function\s+isAuthFailureResponse[\s\S]*?\n\}/);
  if (fnMatch) {
    authFailureFn = fnMatch[0].replace(/^export\s+/, '');
  }
}
template = authFailureFn + '\n\n' + template;

// Resolve API_BASE for server push endpoint
if (config.features?.serverPush?.enabled) {
  let apiBase = '';
  const configJsPath = join(swoffDir, 'config.js');
  if (existsSync(configJsPath)) {
    try {
      const _require = createRequire(import.meta.url);
      const configMod = _require(configJsPath);
      apiBase = configMod.API_BASE || '';
    } catch {}
  } else {
    const configTsPath = join(swoffDir, 'config.ts');
    if (existsSync(configTsPath)) {
      const content = readFileSync(configTsPath, 'utf8');
      const match = content.match(/export\s+const\s+API_BASE\s*=\s*"([^"]+)"/);
      apiBase = match ? match[1] : '';
    }
  }
  template = template.replace(/SWOFF_API_BASE/g, apiBase);
}

const outputDir = config.build?.outputDir || 'dist';
const swFilename = config.build?.swFilename || 'sw';

const outDir = join(projectRoot, outputDir);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

function collectAssets(dir, baseDir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const assets = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      assets.push(...collectAssets(fullPath, baseDir));
    } else {
      assets.push('/' + relative(baseDir, fullPath));
    }
  }
  return assets;
}

const dirsRaw = config.build?.precacheDirs || {};
const dirs = dirsRaw;
const allAssets = [];
  for (const [dir, raw] of Object.entries(dirs)) {
    const dirPath = join(projectRoot, dir);
    if (existsSync(dirPath)) {
      const cfg = raw;
      const normPrefix = cfg.prefix.replace(/\/+$/, '');
      const matchExtensions = cfg.matchExtensions;
      const stripExtensions = cfg.stripExtensions;
      const stripSuffixes = cfg.stripSuffixes;
      for (const a of collectAssets(dirPath, dirPath)) {
        if (matchExtensions?.length && !matchExtensions.includes(extname(a))) continue;
        let url = normPrefix + '/' + a.slice(1);
        if (stripExtensions?.includes(extname(a))) url = url.replace(/\.[^/.]+$/, '');
        if (stripSuffixes) {
        for (const suffix of stripSuffixes) {
          if (url.endsWith('/' + suffix)) {
            url = url.slice(0, -suffix.length - 1) + '/';
          }
        }
      }
      if (url !== '/' && url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      allAssets.push(url);
    }
  }
}
const swFile = `${swFilename}.js`;
const filtered = allAssets.filter(a => a !== `/${swFile}`);
const nav = config.features?.serviceWorker?.navigation || {};
const fallback = [];
if (nav.fallback) fallback.push(nav.fallback);
if (config.features?.pwa?.enabled) fallback.push('/manifest.json');
if (nav.precacheRoutes) {
  for (const route of nav.precacheRoutes) {
    if (!fallback.includes(route)) fallback.push(route);
  }
}
if (nav.rules) {
  for (const rule of nav.rules) {
    if (rule.fallback && !fallback.includes(rule.fallback)) fallback.push(rule.fallback);
  }
}
const assetsToCache = [...new Set([...fallback, ...filtered])];

const swConfig = config.features?.serviceWorker || {};
const concurrency = swConfig.precache?.concurrency ?? 1;
const delayMs = swConfig.precache?.delayMs ?? 0;

let sw = template;
sw = sw.replace(/let ASSETS_TO_CACHE = \[\];?/, () => `let ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)};`);
sw = sw.replace(/let PRECACHE_CONCURRENCY = \d+;?/, () => `let PRECACHE_CONCURRENCY = ${concurrency};`);
sw = sw.replace(/let PRECACHE_DELAY_MS = \d+;?/, () => `let PRECACHE_DELAY_MS = ${delayMs};`);
sw = sw.replace(/let AUTO_SKIP_WAITING = (?:true|false);?/, () => `let AUTO_SKIP_WAITING = ${swConfig.autoActivate || false};`);
sw = sw.replace(/let CACHE_NAME = "";?/, `const CACHE_NAME = "${Date.now()}";`);

writeFileSync(join(outDir, swFile), sw);
const hasPrecache = Object.keys(config.build?.precacheDirs || {}).length > 0;
if (!hasPrecache) {
  console.warn('Warning: No precacheDirs configured. Only explicit fallback routes will be precached.');
}
console.log(`Service worker built: ${outputDir}/${swFile}`);
