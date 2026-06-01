import { readFileSync, writeFileSync } from "fs";

export interface GeneratedAssets {
  icons: Array<{ name: string; width: number; height: number; purpose?: string }>;
  appleIcon: { name: string; width: number; height: number };
  hasFaviconIco: boolean;
  hasOgImage: boolean;
}

export function patchManifest(manifestPath: string, assets: GeneratedAssets): void {
  let manifest: any;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch {
    manifest = {
      name: "App", short_name: "App", description: "",
      start_url: "/", display: "standalone",
      background_color: "#ffffff", theme_color: "#000000",
      icons: [],
    };
  }

  manifest.icons = assets.icons.map((ic) => ({
    src: `/${ic.name}.png`,
    sizes: `${ic.width}x${ic.height}`,
    type: "image/png",
    ...(ic.purpose ? { purpose: ic.purpose } : {}),
  }));

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}
