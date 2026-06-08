import { GeneratorContext, writeFile } from "./context.js";

export function generateSwGeneratorBuild(ctx: GeneratorContext): void {
  const code = `#!/usr/bin/env node
/**
 * Swoff SW Generator Build Script
 * Reads swoff/sw/template.js and generates versioned SW output.
 *
 * Add to package.json:
 *   "build": "your-build && node swoff/sw/generator.js"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();

const pkgPath = join(projectRoot, 'package.json');
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

const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '1.0.0' };
const config = JSON.parse(readFileSync(configPath, 'utf8'));
let template = readFileSync(templatePath, 'utf8');

// Resolve API_BASE for server push endpoint
if (config.features?.serverPush?.enabled) {
  let apiBase = '';
  const configJsPath = join(swoffDir, 'config.js');
  if (existsSync(configJsPath)) {
    try {
      const configMod = require(configJsPath);
      apiBase = configMod.API_BASE || '';
    } catch {}
  } else {
    const configTsPath = join(swoffDir, 'config.ts');
    if (existsSync(configTsPath)) {
      const content = readFileSync(configTsPath, 'utf8');
      const match = content.match(/export\\s+const\\s+API_BASE\\s*=\\s*"([^"]+)"/);
      apiBase = match ? match[1] : '';
    }
  }
  template = template.replace(/SWOFF_API_BASE/g, apiBase);
}

const swoffDir = join(projectRoot, 'swoff');
const swoffVersionPath = join(swoffDir, 'sw-version.js');

const swConfig = config.features?.serviceWorker || {};
const versionField = swConfig.version;

const versionEnabled = versionField !== false && versionField !== "hash";
let version;
if (versionField === "package") {
  version = (pkg.version || '1.0.0');
} else if (versionField === "hash") {
  version = "0.0.0";
} else if (versionField === "manual") {
  // Read version from the user-editable swoff/sw-version.js
  if (existsSync(swoffVersionPath)) {
    const versionContent = readFileSync(swoffVersionPath, 'utf8');
    const match = versionContent.match(/SW_VERSION\s*=\s*["']([^"']+)["']/);
    version = match ? match[1] : '1.0.0';
  } else {
    version = '1.0.0';
  }
} else {
  version = (pkg.version || '1.0.0');
}
const outputDir = config.build?.outputDir || 'dist';
const swFilename = config.build?.swFilename || 'sw';

const outDir = join(projectRoot, outputDir);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

function collectAssets(dir, baseDir) {
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

function generateCacheNameHash() {
  return 'sw-cache-' + Date.now().toString(36);
}

const dirsRaw = config.build?.precacheDirs || {};
const dirs = Object.keys(dirsRaw).length > 0 ? dirsRaw : { [outputDir]: "/" };
const allAssets = [];
for (const [dir, prefix] of Object.entries(dirs)) {
  const dirPath = join(projectRoot, dir);
  if (existsSync(dirPath)) {
    const normPrefix = prefix.replace(/\\/+$/, '');
    for (const a of collectAssets(dirPath, dirPath)) {
      allAssets.push(normPrefix + '/' + a.slice(1));
    }
  }
}
const swFile = versionEnabled ? \`\${swFilename}-v\${version}.js\` : \`\${swFilename}.js\`;
const filtered = allAssets.filter(a => !a.endsWith(swFile) && a !== '/version.json');
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
    if (rule.policy === "cache-first" && rule.match && !fallback.includes(rule.match)) fallback.push(rule.match);
  }
}
const combined = [...new Set([...fallback, ...filtered])];
const assetsToCache = combined.map(url => ({ url, options: {} }));

let sw = template;
const sentinel = 'SW_CACHE_SENTINEL';
if (versionEnabled) {
  sw = sw.replace('// [[CACHE_NAME]]', \`CACHE_NAME = 'sw-v\${version}'\`);
} else {
  sw = sw.replace('// [[CACHE_NAME]]', \`CACHE_NAME = '\${sentinel}'\`);
}
sw = sw.replace('// [[ASSETS_LIST]]', \`ASSETS_TO_CACHE = \${JSON.stringify(assetsToCache, null, 2)}\`);
sw = sw.replace('// [[AUTO_SKIP_WAITING]]', \`const AUTO_SKIP_WAITING = \${config.features?.serviceWorker?.autoActivate || false};\`);

if (!versionEnabled) {
  const cacheName = generateCacheNameHash();
  sw = sw.replace(sentinel, cacheName);
  writeFileSync(join(outDir, swFile), sw);
  console.log(\`Service worker built: \${outputDir}/\${swFile}\`);
} else {
  writeFileSync(join(outDir, swFile), sw);
  writeFileSync(join(outDir, 'version.json'), JSON.stringify({
    version,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(\`Service worker built: \${outputDir}/\${swFile}\`);
}
`;

  writeFile(ctx, "sw/generator.js", code);
}
