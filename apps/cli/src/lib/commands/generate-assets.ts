import { existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { generateAssets } from "../generators/asset-generator/generate.js";

export async function generateAssetsCommand(projectRoot: string, args: string[]) {
  log.header("Generating PWA Assets");

  const { config } = await loadConfigAsync(projectRoot);
  const assets = config.features.pwa.assets;

  const sourceArg = (() => {
    const idx = args.indexOf("--source");
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    if (assets.source) return join(projectRoot, assets.source);
    return "";
  })();

  if (!sourceArg) {
    log.error("No source specified. Use --source <path> or configure pwa.assets.source in swoff.config.json");
    log.help("Usage: swoff generate-assets --source ./logo.svg");
    process.exit(1);
  }

  const manifestPath = join(projectRoot, assets.outputDir, "manifest.json");
  const htmlPath = join(projectRoot, "index.html");

  const result = await generateAssets({
    source: sourceArg,
    outputDir: join(projectRoot, assets.outputDir),
    appName: config.framework || "App",
    themeColor: assets.themeColor,
    bgColor: assets.bgColor,
    manifestPath: existsSync(manifestPath) ? manifestPath : undefined,
    htmlPath: existsSync(htmlPath) ? htmlPath : undefined,
    appleSplash: !args.includes("--no-splash"),
  });

  log.success(`Generated ${result.files.length} PWA assets`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) log.warn(w);
  }
}
