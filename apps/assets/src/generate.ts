import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { Jimp } from "jimp";
import { rasterizeSource } from "./rasterize.js";
import { createMaskable, createMonochrome } from "./maskable.js";
import { encodeIco } from "./ico-encoder.js";
import {
  PWA_ICONS,
  APPLE_ICONS,
  APPLE_SPLASH_SCREENS,
  FAVICON_SIZES,
  OG_IMAGE,
  MONOCHROME_ICONS,
  MS_TILE_ICONS,
} from "./sizes.js";

export interface ShortcutEntry {
  name: string;
  url: string;
  description?: string;
  icons?: Array<{ src: string; sizes: string }>;
}

export interface DarkModeConfig {
  themeColor: string;
  backgroundColor: string;
}

export interface GenerateOptions {
  source: string;
  outputDir: string;
  appName: string;
  shortName?: string;
  description?: string;
  startUrl?: string;
  themeColor: string;
  bgColor: string;
  appleSplash?: boolean;
  monochrome?: boolean;
  msTileColor?: string;
  darkMode?: DarkModeConfig;
  shortcuts?: ShortcutEntry[];
  onProgress?: (message: string) => void;
}

export interface GenerateResult {
  files: string[];
  warnings: string[];
}

function writePng(filePath: string, buffer: Buffer): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
}

export async function generateAssets(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const {
    source,
    outputDir,
    appName,
    appleSplash,
    monochrome,
    msTileColor,
    darkMode,
    shortcuts,
    onProgress,
  } = options;
  const warnings: string[] = [];
  const files: string[] = [];

  mkdirSync(outputDir, { recursive: true });

  onProgress?.("Rasterizing source...");

  const bgColorInt = hexToRgbaInt(options.bgColor);

  const basePng = await rasterizeSource(source, 1024);
  const baseImg = await Jimp.read(basePng);
  const baseW = baseImg.bitmap.width;
  const baseH = baseImg.bitmap.height;

  function resizeToSquare(size: number): Promise<Buffer> {
    return resizePng(basePng, size, size);
  }

  const allIconEntries: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }> = [];

  function addIcon(
    name: string,
    width: number,
    height: number,
    purpose?: string,
  ) {
    allIconEntries.push({
      src: `/${name}.png`,
      sizes: `${width}x${height}`,
      type: "image/png",
      ...(purpose ? { purpose } : {}),
    });
  }

  onProgress?.("PWA icons...");
  for (const icon of PWA_ICONS) {
    if (icon.purpose === "maskable") {
      const buf = await createMaskable(basePng, icon.width, bgColorInt);
      const path = join(outputDir, `${icon.name}.png`);
      writePng(path, buf);
      files.push(path);
      addIcon(icon.name, icon.width, icon.height, "maskable");
    } else {
      const buf = await resizeToSquare(icon.width);
      const path = join(outputDir, `${icon.name}.png`);
      writePng(path, buf);
      files.push(path);
      addIcon(icon.name, icon.width, icon.height);
    }
  }

  onProgress?.("Apple icon...");
  for (const icon of APPLE_ICONS) {
    const buf = await resizeToSquare(icon.width);
    const path = join(outputDir, `${icon.name}.png`);
    writePng(path, buf);
    files.push(path);
    addIcon(icon.name, icon.width, icon.height);
  }

  if (monochrome) {
    onProgress?.("Monochrome icons...");
    const monoColor = hexToRgbaInt(options.themeColor);
    for (const icon of MONOCHROME_ICONS) {
      const buf = await createMonochrome(basePng, icon.width, monoColor);
      const path = join(outputDir, `${icon.name}.png`);
      writePng(path, buf);
      files.push(path);
      addIcon(icon.name, icon.width, icon.height, "monochrome");
    }
  }

  if (msTileColor) {
    onProgress?.("MS tile icons...");
    for (const icon of MS_TILE_ICONS) {
      if (icon.width === icon.height) {
        const buf = await resizeToSquare(icon.width);
        const path = join(outputDir, `${icon.name}.png`);
        writePng(path, buf);
        files.push(path);
      } else {
        const buf = await resizePng(basePng, icon.width, icon.height);
        const path = join(outputDir, `${icon.name}.png`);
        writePng(path, buf);
        files.push(path);
      }
    }
  }

  if (darkMode) {
    onProgress?.("Dark mode icons...");
    const darkBgInt = hexToRgbaInt(darkMode.backgroundColor);
    for (const icon of PWA_ICONS) {
      if (icon.purpose === "maskable") {
        const buf = await createMaskable(basePng, icon.width, darkBgInt);
        const path = join(outputDir, `dark-${icon.name}.png`);
        writePng(path, buf);
        files.push(path);
        addIcon(`dark-${icon.name}`, icon.width, icon.height, "maskable");
      } else {
        const buf = await resizeToSquare(icon.width);
        const path = join(outputDir, `dark-${icon.name}.png`);
        writePng(path, buf);
        files.push(path);
        addIcon(`dark-${icon.name}`, icon.width, icon.height);
      }
    }
    for (const icon of APPLE_ICONS) {
      const buf = await resizeToSquare(icon.width);
      const path = join(outputDir, `dark-${icon.name}.png`);
      writePng(path, buf);
      files.push(path);
      addIcon(`dark-${icon.name}`, icon.width, icon.height);
    }
  }

  const icoPngs: Buffer[] = [];
  for (const size of FAVICON_SIZES) {
    icoPngs.push(await resizeToSquare(size.width));
  }
  const icoPath = join(outputDir, "favicon.ico");
  writePng(icoPath, encodeIco(icoPngs));
  files.push(icoPath);

  onProgress?.("OG image...");
  {
    const og = OG_IMAGE;
    const img = await Jimp.read(basePng);
    const canvas = new Jimp({
      width: og.width,
      height: og.height,
      color: bgColorInt,
    });
    const maxW = og.width * 0.7;
    const maxH = og.height * 0.6;
    const scale = Math.min(maxW / img.bitmap.width, maxH / img.bitmap.height);
    const newW = Math.round(img.bitmap.width * scale);
    const newH = Math.round(img.bitmap.height * scale);
    img.resize({ w: newW, h: newH });
    canvas.composite(
      img,
      Math.round((og.width - newW) / 2),
      Math.round((og.height - newH) / 2 + og.height * 0.05),
    );
    const path = join(outputDir, `${og.name}.png`);
    writePng(path, await canvas.getBuffer("image/png"));
    files.push(path);
  }

  if (appleSplash !== false) {
    onProgress?.("Splash screens...");
    for (const splash of APPLE_SPLASH_SCREENS) {
      const img = await Jimp.read(basePng);
      const canvas = new Jimp({
        width: splash.width,
        height: splash.height,
        color: bgColorInt,
      });
      const maxLogoDim = Math.min(splash.width, splash.height) * 0.3;
      const scale = Math.min(maxLogoDim / baseW, maxLogoDim / baseH);
      const newW = Math.round(baseW * scale);
      const newH = Math.round(baseH * scale);
      img.resize({ w: newW, h: newH });
      canvas.composite(
        img,
        Math.round((splash.width - newW) / 2),
        Math.round((splash.height - newH) / 2),
      );
      const path = join(outputDir, `${splash.name}.png`);
      writePng(path, await canvas.getBuffer("image/png"));
      files.push(path);
    }
  }

  if (msTileColor) {
    writeBrowserConfig(outputDir, msTileColor);
    files.push(join(outputDir, "browserconfig.xml"));
  }

  {
    if (source.toLowerCase().endsWith(".svg")) {
      const svgBuf = readFileSync(source);
      writeFileSync(join(outputDir, "favicon.svg"), svgBuf);
    } else {
      const smallPng = await resizeToSquare(32);
      const b64 = smallPng.toString("base64");
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <image href="data:image/png;base64,${b64}" width="32" height="32"/>
</svg>`;
      writeFileSync(join(outputDir, "favicon.svg"), svgContent);
    }
    files.push(join(outputDir, "favicon.svg"));
  }

  onProgress?.("Writing manifest.json...");
  writeManifest(outputDir, options, allIconEntries);
  files.push(join(outputDir, "manifest.json"));

  onProgress?.("Writing head tags...");
  writeHeadHtml(outputDir, options);
  files.push(join(outputDir, "swoff-head-tags.html"));

  return { files, warnings };
}

function writeManifest(
  outDir: string,
  opts: GenerateOptions,
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>,
): void {
  const screenshots: Array<{
    src: string;
    sizes: string;
    type: string;
    form_factor: string;
    label: string;
  }> = [];

  screenshots.push({
    src: `/${OG_IMAGE.name}.png`,
    sizes: `${OG_IMAGE.width}x${OG_IMAGE.height}`,
    type: "image/png",
    form_factor: "wide",
    label: `${opts.appName} screenshot`,
  });

  const manifest: Record<string, unknown> = {
    id: opts.startUrl || "/",
    name: opts.appName,
    short_name: opts.shortName || opts.appName,
    description: opts.description || `${opts.appName} — offline-first web application`,
    start_url: opts.startUrl || "/",
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

  if (opts.darkMode) {
    manifest.theme_color = opts.darkMode.themeColor;
  }

  if (opts.shortcuts && opts.shortcuts.length > 0) {
    manifest.shortcuts = opts.shortcuts.map((s) => ({
      name: s.name,
      url: s.url,
      ...(s.description ? { description: s.description } : {}),
      ...(s.icons && s.icons.length > 0 ? { icons: s.icons } : {}),
    }));
  }

  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
}

function writeBrowserConfig(outDir: string, tileColor: string): void {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/ms-tile-150x150.png" />
      <wide310x150logo src="/ms-tile-310x150.png" />
      <square144x144logo src="/ms-tile-144.png" />
      <TileColor>${tileColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
  writeFileSync(join(outDir, "browserconfig.xml"), xml);
}

function writeHeadHtml(outDir: string, opts: GenerateOptions): void {
  const lines: string[] = [];
  lines.push("<!-- PWA assets generated by @swoff/assets -->");
  lines.push(`<link rel="icon" type="image/x-icon" href="/favicon.ico" />`);
  lines.push(`<link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="any" />`);
  lines.push(`<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`);
  if (opts.darkMode) {
    lines.push(
      `<link rel="apple-touch-icon" href="/dark-apple-touch-icon.png" media="(prefers-color-scheme: dark)" />`,
    );
  }
  lines.push(`<link rel="manifest" href="/manifest.json" />`);
  lines.push(`<meta name="theme-color" content="${opts.themeColor}" />`);
  if (opts.darkMode) {
    lines.push(
      `<meta name="theme-color" content="${opts.darkMode.themeColor}" media="(prefers-color-scheme: dark)" />`,
    );
  }
  lines.push(`<meta name="mobile-web-app-capable" content="yes" />`);
  lines.push(`<meta property="og:image" content="/og-image.png" />`);
  lines.push(`<meta property="og:image:width" content="1200" />`);
  lines.push(`<meta property="og:image:height" content="630" />`);
  lines.push(`<meta name="twitter:card" content="summary_large_image" />`);

  if (opts.appleSplash !== false) {
    lines.push(`<!-- Apple splash screens -->`);
    lines.push(
      `<link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />`,
    );
    lines.push(
      `<link rel="apple-touch-startup-image" href="/splash-1668x2224.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" />`,
    );
    lines.push(
      `<link rel="apple-touch-startup-image" href="/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />`,
    );
    lines.push(
      `<link rel="apple-touch-startup-image" href="/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />`,
    );
    lines.push(
      `<link rel="apple-touch-startup-image" href="/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />`,
    );
    lines.push(
      `<link rel="apple-touch-startup-image" href="/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />`,
    );
    lines.push(
      `<link rel="apple-touch-startup-image" href="/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />`,
    );
  }

  if (opts.msTileColor) {
    lines.push(
      `<meta name="msapplication-TileColor" content="${opts.msTileColor}" />`,
    );
    lines.push(
      `<meta name="msapplication-TileImage" content="/ms-tile-144.png" />`,
    );
    lines.push(
      `<meta name="msapplication-config" content="/browserconfig.xml" />`,
    );
  }

  writeFileSync(join(outDir, "swoff-head-tags.html"), lines.join("\n") + "\n");
}

async function resizePng(
  sourceBuf: Buffer,
  w: number,
  h: number,
): Promise<Buffer> {
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
