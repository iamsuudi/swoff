/**
 * clean command - removes old versioned service worker files.
 */

import { readFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";

export async function cleanCommand(projectRoot: string) {
  log.header("Cleaning Old Service Worker Files");

  const { config, configPath } = await loadConfigAsync(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  const outputDir = config.build.outputDir || "dist";
  const swFilename = config.build.swFilename || "sw";
  const escapedName = swFilename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const distPath = join(projectRoot, outputDir);
  if (!existsSync(distPath)) {
    log.info(`No ${outputDir}/ directory found. Nothing to clean.`);
    return;
  }

  const currentVersionPath = join(distPath, "version.json");
  let currentVersion: string | null = null;
  if (existsSync(currentVersionPath)) {
    const versionInfo = JSON.parse(readFileSync(currentVersionPath, "utf8"));
    currentVersion = versionInfo.version;
  }

  const files = readdirSync(distPath);
  const swPattern = new RegExp(`^${escapedName}-v\\d+\\.\\d+\\.\\d+\\.js$`);
  const swFiles = files.filter((f) => swPattern.test(f));

  if (swFiles.length === 0) {
    log.info("No versioned service worker files found.");
    return;
  }

  let deleted = 0;
  for (const file of swFiles) {
    const versionMatch = file.match(/v(\d+\.\d+\.\d+)\.js$/);
    if (versionMatch && versionMatch[1] !== currentVersion) {
      const filePath = join(distPath, file);
      unlinkSync(filePath);
      log.info(`Deleted: ${outputDir}/${file}`);
      deleted++;
    }
  }

  if (deleted === 0) {
    log.info("No old service worker files to clean.");
  } else {
    log.success(`Cleaned ${deleted} old service worker file(s).`);
  }
}
