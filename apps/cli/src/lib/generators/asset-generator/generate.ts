import { mkdirSync, writeFileSync, readFileSync, copyFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { Jimp } from "jimp";
import { rasterizeSource } from "./rasterize.js";
import { createMaskable } from "./maskable.js";
import { encodeIco } from "./ico-encoder.js";
import { patchManifest, type GeneratedAssets } from "./manifest-patcher.js";
import { patchHtml, type HtmlMeta } from "./html-patcher.js";
import {
  PWA_ICONS,
  APPLE_ICONS,
  APPLE_SPLASH_SCREENS,
  FAVICON_SIZES,
  OG_IMAGE,
} from "./sizes.js";

export interface GenerateOptions {
  source: string;
  outputDir: string;
  appName: string;
  themeColor: string;
  bgColor: string;
  manifestPath?: string;
  htmlPath?: string;
  appleSplash?: boolean;
}

export interface GenerateResult {
  files: string[];
  warnings: string[];
}

function writePng(filePath: string, buffer: Buffer): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
}

export async function generateAssets(options: GenerateOptions): Promise<GenerateResult> {
  const { source, outputDir, appName, themeColor, bgColor, appleSplash } = options;
  const warnings: string[] = [];
  const files: string[] = [];

  mkdirSync(outputDir, { recursive: true });

  const themeColorInt = hexToRgbaInt(themeColor);
  const bgColorInt = hexToRgbaInt(bgColor);

  const basePng = await rasterizeSource(source, 1024);
  const baseImg = await Jimp.read(basePng);
  const baseW = baseImg.bitmap.width;
  const baseH = baseImg.bitmap.height;

  function resizeToSquare(size: number): Promise<Buffer> {
    return resizePng(basePng, size, size);
  }

  // 1. PWA icons
  for (const icon of PWA_ICONS) {
    if (icon.purpose === "maskable") {
      const buf = await createMaskable(basePng, icon.width, bgColorInt);
      const path = join(outputDir, `${icon.name}.png`);
      writePng(path, buf);
      files.push(path);
    } else {
      const buf = await resizeToSquare(icon.width);
      const path = join(outputDir, `${icon.name}.png`);
      writePng(path, buf);
      files.push(path);
    }
  }

  // 2. Apple touch icon
  for (const icon of APPLE_ICONS) {
    const buf = await resizeToSquare(icon.width);
    const path = join(outputDir, `${icon.name}.png`);
    writePng(path, buf);
    files.push(path);
  }

  // 3. Favicon SVG + ICO
  const ext = source.toLowerCase().split(".").pop();
  if (ext === "svg") {
    const svgDest = join(outputDir, "favicon.svg");
    copyFileSync(source, svgDest);
    files.push(svgDest);
  } else {
    const svgPath = join(outputDir, "favicon.svg");
    const simpleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="8" fill="${themeColor}"/>
</svg>`;
    writeFileSync(svgPath, simpleSvg);
    files.push(svgPath);
  }

  const icoPngs: Buffer[] = [];
  for (const size of FAVICON_SIZES) {
    icoPngs.push(await resizeToSquare(size.width));
  }
  const icoPath = join(outputDir, "favicon.ico");
  writePng(icoPath, encodeIco(icoPngs));
  files.push(icoPath);

  // 4. OG image 1200x630
  {
    const og = OG_IMAGE;
    const img = await Jimp.read(basePng);
    const canvas = new Jimp({ width: og.width, height: og.height, color: bgColorInt });
    const maxW = og.width * 0.7;
    const maxH = og.height * 0.6;
    const scale = Math.min(maxW / img.bitmap.width, maxH / img.bitmap.height);
    const newW = Math.round(img.bitmap.width * scale);
    const newH = Math.round(img.bitmap.height * scale);
    img.resize({ w: newW, h: newH });
    canvas.composite(img, Math.round((og.width - newW) / 2), Math.round((og.height - newH) / 2 + og.height * 0.05));
    const path = join(outputDir, `${og.name}.png`);
    writePng(path, await canvas.getBuffer("image/png"));
    files.push(path);
  }

  // 5. Apple splash screens
  if (appleSplash !== false) {
    for (const splash of APPLE_SPLASH_SCREENS) {
      const img = await Jimp.read(basePng);
      const canvas = new Jimp({ width: splash.width, height: splash.height, color: bgColorInt });
      const scale = Math.max(splash.width / baseW, splash.height / baseH);
      const newW = Math.round(baseW * scale);
      const newH = Math.round(baseH * scale);
      img.resize({ w: newW, h: newH });
      canvas.composite(img, Math.round((splash.width - newW) / 2), Math.round((splash.height - newH) / 2));
      const path = join(outputDir, `${splash.name}.png`);
      writePng(path, await canvas.getBuffer("image/png"));
      files.push(path);
    }
  }

  // 6. Patch manifest.json
  if (options.manifestPath) {
    const ga: GeneratedAssets = {
      icons: PWA_ICONS,
      appleIcon: APPLE_ICONS[0],
      hasFaviconIco: true,
      hasOgImage: true,
    };
    patchManifest(options.manifestPath, ga);
  }

  // 7. Patch index.html
  if (options.htmlPath) {
    const meta: HtmlMeta = {
      appName,
      themeColor,
      bgColor,
      ogImagePath: `/${OG_IMAGE.name}.png`,
      appleTouchIconPath: `/${APPLE_ICONS[0].name}.png`,
      splashPaths: appleSplash !== false ? APPLE_SPLASH_SCREENS.map((s) => `/${s.name}.png`) : [],
      faviconSvgPath: "/favicon.svg",
      faviconIcoPath: "/favicon.ico",
    };
    patchHtml(options.htmlPath, meta);
  }

  return { files, warnings };
}

async function resizePng(sourceBuf: Buffer, w: number, h: number): Promise<Buffer> {
  const img = await Jimp.read(sourceBuf);
  const scale = Math.min(w / img.bitmap.width, h / img.bitmap.height);
  const newW = Math.round(img.bitmap.width * scale);
  const newH = Math.round(img.bitmap.height * scale);
  img.resize({ w: newW, h: newH });
  const canvas = new Jimp({ width: w, height: h, color: 0x00000000 });
  canvas.composite(img, Math.round((w - newW) / 2), Math.round((h - newH) / 2));
  return canvas.getBuffer("image/png");
}

function hexToRgbaInt(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}
