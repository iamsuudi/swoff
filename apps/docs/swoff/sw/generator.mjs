#!/usr/bin/env node
/**
 * Swoff SW Generator Build Script
 * Reads swoff/sw/template.js and generates the final SW output.
 *
 * Add to package.json:
   *   "build": "your-build && node swoff/sw/generator.mjs"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { collectAssets, buildFallbackList, scanPrecacheAssets } from './build-utils.mjs';

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

const rawSwoffPath = config.build?.swoffPath || 'swoff';
const swoffDir = join(projectRoot, rawSwoffPath === '.' ? 'swoff' : rawSwoffPath);

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

const swOutput = config.build?.swOutput || 'dist';

const outDir = join(projectRoot, swOutput);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const swFile = "swoff.sw.js";
const scanned = scanPrecacheAssets(config, projectRoot, swFile);
const fallback = buildFallbackList(config);
const filtered = scanned.filter(a => a !== "/" + swFile);
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
console.log(`Service worker built: ${swOutput}/${swFile}`);
