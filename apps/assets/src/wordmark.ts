import { Jimp, loadFont, measureText, measureTextHeight } from "jimp";
import { SANS_128_BLACK } from "jimp/fonts";

export interface WordmarkOptions {
  text: string;
  themeColor: string;
  backgroundColor: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function truncateForIcon(text: string): string {
  return text.trim().length > 0 ? text.trim() : "?";
}

/**
 * Builds an SVG app icon from text — a rounded-rect tile with the app's
 * initial (or full name up to a few characters) set in the theme color.
 * Feeds through the same resvg rasterizer used for SVG sources.
 */
export function buildWordmarkSvg(opts: WordmarkOptions): string {
  const text = truncateForIcon(opts.text);
  const single = text.length === 1;
  const fontSize = single ? 300 : Math.max(72, Math.min(300, Math.round(1400 / text.length)));
  const label = single ? text : text.slice(0, 8).toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${opts.backgroundColor}" />
  <rect x="32" y="32" width="448" height="448" rx="112" fill="${withAlpha(opts.themeColor, 0.14)}" />
  <text x="256" y="256" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    font-size="${fontSize}" font-weight="700" fill="${opts.themeColor}">${label}</text>
</svg>`;
}

function isOpaqueImage(buffer: Buffer): Promise<boolean> {
  return Jimp.read(buffer).then((img) => {
    const { data, width, height } = img.bitmap;
    for (let i = 0; i < width * height; i += 4096) {
      const end = Math.min(i + 4096, width * height);
      for (let px = i; px < end; px++) {
        if (data[px * 4 + 3] !== 0) return true;
      }
    }
    return false;
  });
}

/**
 * Fallback for environments where the resvg pass produced an empty image
 * (e.g. no system fonts available in headless CI). Renders a bitmap-font
 * monogram on the theme background. Emits a warning via the returned flag.
 */
export async function renderWordmarkWithBitmapFont(
  opts: WordmarkOptions,
  size: number,
): Promise<{ png: Buffer; usedFallback: boolean }> {
  const text = truncateForIcon(opts.text).slice(0, 1).toUpperCase();
  const font = await loadFont(SANS_128_BLACK);
  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });
  const w = measureText(font, text);
  const h = measureTextHeight(font, text, size);
  canvas.print({
    font,
    x: Math.round((size - w) / 2),
    y: Math.round((size - h) / 2),
    text,
  });
  const bg = hexToRgb(opts.backgroundColor);
  const fg = hexToRgb(opts.themeColor);
  canvas.scan(0, 0, size, size, (x, y, idx) => {
    const alpha = canvas.bitmap.data[idx + 3];
    if (alpha === 0) {
      canvas.bitmap.data[idx] = bg.r;
      canvas.bitmap.data[idx + 1] = bg.g;
      canvas.bitmap.data[idx + 2] = bg.b;
      canvas.bitmap.data[idx + 3] = 255;
    } else {
      canvas.bitmap.data[idx] = fg.r;
      canvas.bitmap.data[idx + 1] = fg.g;
      canvas.bitmap.data[idx + 2] = fg.b;
      canvas.bitmap.data[idx + 3] = alpha;
    }
  });
  return { png: await canvas.getBuffer("image/png"), usedFallback: true };
}

/**
 * Rasterizes the text-derived icon, transparently falling back to the bitmap
 * font when resvg rendered nothing.
 */
export async function rasterizeWordmark(
  opts: WordmarkOptions,
  targetSize: number,
): Promise<{ png: Buffer; usedFallback: boolean }> {
  const { rasterizeSvgString } = await import("./rasterize.js");
  const rendered = await rasterizeSvgString(buildWordmarkSvg(opts), targetSize);
  const opaque = await isOpaqueImage(rendered);
  if (!opaque) {
    return renderWordmarkWithBitmapFont(opts, targetSize);
  }
  return { png: rendered, usedFallback: false };
}