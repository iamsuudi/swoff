export interface AssetSize {
  name: string;
  width: number;
  height: number;
  purpose?: string;
}

export const PWA_ICONS: AssetSize[] = [
  { name: "icon-64", width: 64, height: 64, purpose: "any" },
  { name: "icon-192", width: 192, height: 192, purpose: "any" },
  { name: "icon-512", width: 512, height: 512, purpose: "any" },
  { name: "maskable-icon-512", width: 512, height: 512, purpose: "maskable" },
];

export const APPLE_ICONS: AssetSize[] = [
  { name: "apple-touch-icon", width: 180, height: 180 },
];

export const APPLE_SPLASH_SCREENS: AssetSize[] = [
  { name: "splash-2048x2732", width: 2048, height: 2732 },
  { name: "splash-1668x2224", width: 1668, height: 2224 },
  { name: "splash-1536x2048", width: 1536, height: 2048 },
  { name: "splash-1125x2436", width: 1125, height: 2436 },
  { name: "splash-1242x2208", width: 1242, height: 2208 },
  { name: "splash-750x1334", width: 750, height: 1334 },
  { name: "splash-640x1136", width: 640, height: 1136 },
];

export const FAVICON_SIZES: AssetSize[] = [
  { name: "favicon-16", width: 16, height: 16 },
  { name: "favicon-32", width: 32, height: 32 },
  { name: "favicon-48", width: 48, height: 48 },
];

export const OG_IMAGE: AssetSize = { name: "og-image", width: 1200, height: 630 };
