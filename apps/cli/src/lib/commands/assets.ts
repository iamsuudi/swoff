import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { generateAssets } from "../generators/asset-generator/generate.js";
import { printAssetGuide } from "../generators/asset-generator/guide.js";

export interface AssetsOptions {
  source?: string;
  noSplash?: boolean;
}

export async function generateAssetsCommand(projectRoot: string, opts: AssetsOptions = {}) {
  log.header("Generating PWA Assets");

  const { config } = await loadConfigAsync(projectRoot);
  const assets = config.features.pwa.assets;

  const sourceArg = opts.source || (assets.source ? join(projectRoot, assets.source) : "");

  if (!sourceArg) {
    log.error("No source specified. Use --source <path> or configure pwa.assets.source in swoff.config.json");
    log.help("Usage: swoff assets --source ./logo.svg");
    process.exit(1);
  }

  const result = await generateAssets({
    source: sourceArg,
    outputDir: join(projectRoot, assets.outputDir),
    appName: config.framework || "App",
    themeColor: assets.themeColor,
    bgColor: assets.bgColor,
    appleSplash: !opts.noSplash,
  });

  log.success(`Generated ${result.files.length} PWA assets`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) log.warn(w);
  }

  printAssetGuide({
    appName: config.framework || "App",
    themeColor: assets.themeColor,
    bgColor: assets.bgColor,
    outputDir: assets.outputDir,
    hasSplash: !opts.noSplash,
  });
}
