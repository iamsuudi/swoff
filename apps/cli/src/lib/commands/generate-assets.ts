import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { generateAssets } from "../generators/asset-generator/generate.js";
import { printAssetGuide } from "../generators/asset-generator/guide.js";

interface ParsedArgs {
  source: string;
  outputDir: string;
  appName: string;
  themeColor: string;
  bgColor: string;
  noSplash: boolean;
}

function parseArgs(args: string[]): Partial<ParsedArgs> {
  const get = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };
  return {
    source: get("source"),
    outputDir: get("output-dir"),
    appName: get("app-name"),
    themeColor: get("theme-color"),
    bgColor: get("bg-color"),
    noSplash: args.includes("--no-splash"),
  };
}

function generateManifestJson(outputDir: string, opts: { appName: string; themeColor: string; bgColor: string; hasSplash: boolean }): void {
  const manifest = {
    name: opts.appName,
    short_name: opts.appName,
    description: "Offline-first web application",
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
    icons: [
      { src: "/icon-64.png", sizes: "64x64", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: opts.hasSplash
      ? [{ src: "/og-image.png", sizes: "1200x630", type: "image/png", form_factor: "narrow", label: "App screenshot" }]
      : [],
  };
  writeFileSync(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

export async function generateAssetsCommand(projectRoot: string, args: string[]) {
  log.header("Generating PWA Assets");

  const cli = parseArgs(args);

  // Try loading swoff.config.json for defaults (optional)
  let configDefaults: Partial<ParsedArgs> = {};
  try {
    const { loadConfigAsync } = await import("../config/loader.js");
    const { config } = await loadConfigAsync(projectRoot);
    const assets = config.features.pwa.assets;
    configDefaults = {
      source: assets.source ? join(projectRoot, assets.source) : undefined,
      outputDir: assets.outputDir || "public",
      appName: config.framework || "App",
      themeColor: assets.themeColor || "#000000",
      bgColor: assets.bgColor || "#ffffff",
    };
  } catch {
    // No config — use CLI args only
  }

  const source = cli.source || configDefaults.source;
  const outputDir = cli.outputDir || configDefaults.outputDir || "public";
  const appName = cli.appName || configDefaults.appName || "App";
  const themeColor = cli.themeColor || configDefaults.themeColor || "#000000";
  const bgColor = cli.bgColor || configDefaults.bgColor || "#ffffff";
  const noSplash = cli.noSplash;

  if (!source) {
    log.error("No source specified. Use --source <path> or configure pwa.assets.source in swoff.config.json");
    log.help("Usage: swoff generate-assets --source ./logo.svg");
    process.exit(1);
  }

  if (!existsSync(source)) {
    log.error(`Source file not found: ${source}`);
    process.exit(1);
  }

  const absOutput = join(projectRoot, outputDir);

  const result = await generateAssets({
    source,
    outputDir: absOutput,
    appName,
    themeColor,
    bgColor,
    appleSplash: !noSplash,
  });

  // Generate manifest.json
  try {
    generateManifestJson(absOutput, {
      appName,
      themeColor,
      bgColor,
      hasSplash: !noSplash,
    });
    result.files.push(join(absOutput, "manifest.json"));
  } catch (err: unknown) {
    log.warn(`manifest.json generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  log.success(`Generated ${result.files.length} PWA assets`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) log.warn(w);
  }

  printAssetGuide({
    appName,
    themeColor,
    bgColor,
    outputDir,
    hasSplash: !noSplash,
  });
}
