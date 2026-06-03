import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CACHE_DIR = join(homedir(), ".swoff", "cache", "assets");
const JIMP_VERSION = "1.6.0";
const RESVG_VERSION = "2.6.2";

const JIMP_URL = `https://cdn.jsdelivr.net/npm/jimp@${JIMP_VERSION}/dist/esm/index.js`;
const RESVG_JS_URL = `https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@${RESVG_VERSION}/index.mjs`;
const RESVG_WASM_URL = `https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@${RESVG_VERSION}/index_bg.wasm`;

function cachePath(filename: string): string {
  return join(CACHE_DIR, filename);
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `swoff: failed to download ${url} (${res.status} ${res.statusText}). ` +
        "Check your internet connection and run 'swoff assets' again.",
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

function writeToCache(filename: string, data: Buffer): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(filename), data);
}

interface JimpResult {
  Jimp: any;
}

export async function resolveJimp(): Promise<JimpResult> {
  try {
    return await import("jimp");
  } catch {}

  const filename = `jimp-v${JIMP_VERSION}.mjs`;
  const filePath = cachePath(filename);

  if (existsSync(filePath)) {
    try {
      return await import(`file://${filePath}`);
    } catch {
      rmSync(filePath);
    }
  }

  const buf = await download(JIMP_URL);
  writeToCache(filename, buf);
  return await import(`file://${filePath}`);
}

interface ResvgResult {
  initWasm: any;
  Resvg: any;
  wasmBuffer: Buffer;
}

export async function resolveResvg(): Promise<ResvgResult> {
  try {
    const mod = await import("@resvg/resvg-wasm");
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    try {
      const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
      return { ...mod, wasmBuffer: readFileSync(wasmPath) };
    } catch {}
  } catch {}

  const jsFilename = `resvg-v${RESVG_VERSION}.mjs`;
  const wasmFilename = `resvg-v${RESVG_VERSION}.wasm`;
  const jsPath = cachePath(jsFilename);
  const wasmPath = cachePath(wasmFilename);

  if (existsSync(jsPath) && existsSync(wasmPath)) {
    try {
      const mod = await import(`file://${jsPath}`);
      return { ...mod, wasmBuffer: readFileSync(wasmPath) };
    } catch {
      rmSync(jsPath);
      rmSync(wasmPath);
    }
  }

  const [jsBuf, wasmBuf] = await Promise.all([download(RESVG_JS_URL), download(RESVG_WASM_URL)]);
  writeToCache(jsFilename, jsBuf);
  writeToCache(wasmFilename, wasmBuf);

  const mod = await import(`file://${jsPath}`);
  return { ...mod, wasmBuffer: readFileSync(wasmPath) };
}
