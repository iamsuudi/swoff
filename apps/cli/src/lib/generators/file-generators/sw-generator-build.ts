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
import { join, dirname, relative, extname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

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

const swoffDir = join(projectRoot, 'swoff');

// Prepend isAuthFailureResponse from user's auth/check, or use default fallback
const authCheckTsPath = join(swoffDir, 'auth', 'check.ts');
const authCheckJsPath = join(swoffDir, 'auth', 'check.js');
const authCheckPath = existsSync(authCheckTsPath) ? authCheckTsPath : authCheckJsPath;
let authFailureFn = 'async function isAuthFailureResponse(response) {\\n  return response.status === 401;\\n}';
if (existsSync(authCheckPath)) {
  const authContent = readFileSync(authCheckPath, 'utf8');
  const fnMatch = authContent.match(/export\\s+async\\s+function\\s+isAuthFailureResponse[\\s\\S]*?\\n\\}/);
  if (fnMatch) {
    authFailureFn = fnMatch[0].replace(/^export\\s+/, '');
  }
}
template = authFailureFn + '\\n\\n' + template;

// Resolve API_BASE for server push endpoint
if (config.features?.realtime?.serverPush?.enabled) {
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
      const match = content.match(/export\\s+const\\s+API_BASE\\s*=\\s*"([^"]+)"/);
      apiBase = match ? match[1] : '';
    }
  }
  template = template.replace(/SWOFF_API_BASE/g, apiBase);
}

const swoffVersionPath = join(swoffDir, 'sw-version.js');

const swConfig = config.features?.serviceWorker || {};
const versionField = swConfig.version;

const versionEnabled = versionField !== "hash";
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

function generateCacheNameHash() {
  return 'sw-cache-' + Date.now().toString(36);
}

const dirsRaw = config.build?.precacheDirs || {};
const dirs = Object.keys(dirsRaw).length > 0 ? dirsRaw : { [outputDir]: { prefix: "/" } };
const allAssets = [];
for (const [dir, raw] of Object.entries(dirs)) {
  const dirPath = join(projectRoot, dir);
  if (existsSync(dirPath)) {
    const cfg = raw;
    const normPrefix = cfg.prefix.replace(/\\/+$/, '');
    const extensions = cfg.extensions;
    const stripExt = cfg.stripExtension;
    const stripSuffixes = cfg.stripSuffixes;
    for (const a of collectAssets(dirPath, dirPath)) {
      if (extensions && !extensions.includes(extname(a))) continue;
      let url = normPrefix + '/' + a.slice(1);
      if (stripExt) url = url.replace(/\\.[^/.]+$/, '');
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
  }
}
const combined = [...new Set([...fallback, ...filtered])];
const assetsToCache = combined.map(url => ({ url, options: {} }));

let sw = template;
const sentinel = 'SW_CACHE_SENTINEL';
if (versionEnabled) {
  sw = sw.replace('// [[CACHE_NAME]]', () => \`CACHE_NAME = 'sw-v\${version}'\`);
} else {
  sw = sw.replace('// [[CACHE_NAME]]', () => \`CACHE_NAME = '\${sentinel}'\`);
}
sw = sw.replace('// [[ASSETS_LIST]]', () => \`ASSETS_TO_CACHE = \${JSON.stringify(assetsToCache, null, 2)}\`);
sw = sw.replace('// [[AUTO_SKIP_WAITING]]', () => \`const AUTO_SKIP_WAITING = \${config.features?.serviceWorker?.autoActivate || false};\`);

if (!versionEnabled) {
  const cacheName = generateCacheNameHash();
  sw = sw.replace(sentinel, () => cacheName);
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
