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

  const ver = config.features.serviceWorker.version;
  log.normal(`Version Enabled: ${ver.enabled}`);
  log.normal(`Version Source: ${ver.source}`);
  log.normal(
    `Resolved Version: ${ver.source === "from-package" ? "(from package.json)" : ver.value || "none"}`,
  );
  log.normal(`Default Strategy: ${config.features.serviceWorker.defaultStrategy}`);
  log.normal(`Auto Update: ${config.features.serviceWorker.autoUpdate}`);
  log.normal(`Auto Activate: ${config.features.serviceWorker.autoActivate}`);

  const enabledFeatures = Object.entries(config.features)
    .filter(([k, v]) => {
      if (k === "serviceWorker") return false;
      if (typeof v === "object" && v !== null) return (v as Record<string, unknown>).enabled === true;
      return v === true;
    })
    .map(([k]) => k);
  log.normal("Features Enabled:");
  enabledFeatures.forEach((f) => log.help(`  ${f}`));

  log.normal("Generated Files:");
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
    log.normal(
      `\nService Worker: ${outputDir}/${swFilename}-v${versionInfo.version}.js`,
    );
    log.normal(`Version Info: ${outputDir}/version.json`);
  } else {
    log.normal(`\nService Worker: ${outputDir}/${swFilename}.js (non-versioned)`);
  }
}
