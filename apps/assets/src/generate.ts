import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Jimp } from "jimp";
import { rasterizeSource } from "./rasterize.js";
import { createMaskable } from "./maskable.js";
import { encodeIco } from "./ico-encoder.js";
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
  const { source, outputDir, appleSplash } = options;
  const warnings: string[] = [];
  const files: string[] = [];

  mkdirSync(outputDir, { recursive: true });

  const themeColorInt = hexToRgbaInt(options.themeColor);
  const bgColorInt = hexToRgbaInt(options.bgColor);

  const basePng = await rasterizeSource(source, 1024);
  const baseImg = await Jimp.read(basePng);
  const baseW = baseImg.bitmap.width;
  const baseH = baseImg.bitmap.height;

  function resizeToSquare(size: number): Promise<Buffer> {
    return resizePng(basePng, size, size);
  }

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

  for (const icon of APPLE_ICONS) {
    const buf = await resizeToSquare(icon.width);
    const path = join(outputDir, `${icon.name}.png`);
    writePng(path, buf);
    files.push(path);
  }

  const icoPngs: Buffer[] = [];
  for (const size of FAVICON_SIZES) {
    icoPngs.push(await resizeToSquare(size.width));
  }
  const icoPath = join(outputDir, "favicon.ico");
  writePng(icoPath, encodeIco(icoPngs));
  files.push(icoPath);

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

  if (appleSplash !== false) {
    for (const splash of APPLE_SPLASH_SCREENS) {
      const img = await Jimp.read(basePng);
      const canvas = new Jimp({ width: splash.width, height: splash.height, color: bgColorInt });
      const maxLogoDim = Math.min(splash.width, splash.height) * 0.3;
      const scale = Math.min(maxLogoDim / baseW, maxLogoDim / baseH);
      const newW = Math.round(baseW * scale);
      const newH = Math.round(baseH * scale);
      img.resize({ w: newW, h: newH });
      canvas.composite(img, Math.round((splash.width - newW) / 2), Math.round((splash.height - newH) / 2));
      const path = join(outputDir, `${splash.name}.png`);
      writePng(path, await canvas.getBuffer("image/png"));
      files.push(path);
    }
  }

  writeManifest(outputDir, options);

  const manifestPath = join(outputDir, "manifest.json");
  files.push(manifestPath);

  return { files, warnings };
}

function writeManifest(outDir: string, opts: GenerateOptions): void {
  const icons = [
    ...PWA_ICONS,
    ...APPLE_ICONS,
  ].map((icon) => ({
    src: `/${icon.name}.png`,
    sizes: `${icon.width}x${icon.height}`,
    type: "image/png" as const,
    ...(icon.purpose ? { purpose: icon.purpose } : {}),
  }));

  const screenshots: Array<{ src: string; sizes: string; type: string; form_factor: string; label: string }> = [];

  screenshots.push({
    src: `/${OG_IMAGE.name}.png`,
    sizes: `${OG_IMAGE.width}x${OG_IMAGE.height}`,
    type: "image/png",
    form_factor: "narrow",
    label: `${opts.appName} screenshot`,
  });

  const manifest = {
    name: opts.appName,
    short_name: opts.appName,
    description: `${opts.appName} — offline-first web application`,
    start_url: "/",
    display: "standalone",
    background_color: opts.bgColor,
    theme_color: opts.themeColor,
    orientation: "portrait-primary",
    scope: "/",
    lang: "en-US",
    categories: ["utilities", "web"],
    prefer_related_applications: false,
    display_override: ["window-controls-overlay", "standalone", "browser"],
    icons,
    screenshots,
  };

  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
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
