/**
 * Generates sw-generator.js - build script that processes sw-template.js.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateSwGeneratorBuild(ctx: GeneratorContext): void {
  const code = `#!/usr/bin/env node
/**
 * Swoff SW Generator Build Script
 * Reads swoff/sw-template.js and generates versioned SW output.
 *
 * Add to package.json:
 *   "build": "your-build && node swoff/sw-generator.js"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const pkgPath = join(projectRoot, 'package.json');
const templatePath = join(__dirname, 'sw-template.js');
const configPath = join(projectRoot, 'swoff.config.json');

if (!existsSync(configPath)) {
  console.error('Error: swoff.config.json not found');
  console.log('Run "npx @swoff/cli init" to create one');
  process.exit(1);
}

if (!existsSync(templatePath)) {
  console.error('Error: swoff/sw-template.js not found');
  process.exit(1);
}

const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '1.0.0' };
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const template = readFileSync(templatePath, 'utf8');

const version = config.version === 'from-package' ? pkg.version || '1.0.0' : config.version;
const outputDir = config.build?.outputDir || 'dist';
const swFilename = config.build?.swFilename || 'sw';

const outDir = join(projectRoot, outputDir);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

function collectAssets(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const assets = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      assets.push(...collectAssets(fullPath));
    } else {
      assets.push('/' + relative(outDir, fullPath));
    }
  }
  return assets;
}

const allAssets = collectAssets(outDir);
const swFile = \`\${swFilename}-v\${version}.js\`;
const filtered = allAssets.filter(a => !a.endsWith(swFile) && a !== '/version.json');
const fallback = ['/index.html'];
if (config.features?.pwa) fallback.push('/manifest.json');
const combined = [...new Set([...fallback, ...filtered])];
const assetsToCache = combined.map(url => ({ url, options: {} }));

let sw = template;
sw = sw.replace('// [[CACHE_NAME]]', \`CACHE_NAME = 'sw-v\${version}'\`);
sw = sw.replace('// [[ASSETS_LIST]]', \`ASSETS_TO_CACHE = \${JSON.stringify(assetsToCache, null, 2)}\`);
sw = sw.replace('// [[AUTO_SKIP_WAITING]]', \`const AUTO_SKIP_WAITING = \${config.serviceWorker?.autoActivate || false};\`);

writeFileSync(join(outDir, swFile), sw);
writeFileSync(join(outDir, 'version.json'), JSON.stringify({
  version,
  minSupportedVersion: config.minSupportedVersion || '0.0.0',
  generatedAt: new Date().toISOString(),
}, null, 2));

console.log(\`Service worker built: \${outputDir}/\${swFile}\`);
`;

  writeFile(ctx, "sw-generator.js", code);
}
