/**
 * info command - displays configuration summary and generated files.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";

export async function infoCommand(projectRoot: string) {
  log.header("Swoff Configuration Summary");

  const { config, configPath } = await loadConfigAsync(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Version: ${config.version}`);
  log.info(`SW Version: ${config.version === "from-package" ? "(from package.json)" : config.version}`);
  log.info(`Default Strategy: ${config.serviceWorker.defaultStrategy}`);
  log.info(`Auto Register: ${config.serviceWorker.autoRegister}`);
  log.info(`Auto Activate: ${config.serviceWorker.autoActivate}`);

  const enabledFeatures = Object.entries(config.features)
    .filter(([_, v]) => v)
    .map(([k]) => k);
  log.info("\nFeatures Enabled:");
  enabledFeatures.forEach((f) => log.help(`  ${f}`));

  log.info("\nGenerated Files:");
  const swoffDir = join(projectRoot, "swoff");
  if (existsSync(swoffDir)) {
    const files = readdirSync(swoffDir);
    files.forEach((f) => log.help(`  swoff/${f}`));
  }

  const manifestPath = join(projectRoot, "public", "manifest.json");
  if (existsSync(manifestPath)) {
    log.help("  public/manifest.json");
  }

  const outputDir = config.build.outputDir || "dist";
  const swFilename = config.build.swFilename || "sw";
  const versionPath = join(projectRoot, outputDir, "version.json");
  if (existsSync(versionPath)) {
    const versionInfo = JSON.parse(readFileSync(versionPath, "utf8"));
    log.info(`\nService Worker: ${outputDir}/${swFilename}-v${versionInfo.version}.js`);
    log.info(`Version Info: ${outputDir}/version.json`);
  }
}
