/**
 * clean command - removes Swoff trace from the project (swoff/, config, version info).
 */

import { rmSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";

export async function cleanCommand(projectRoot: string) {
  log.header("Removing Swoff");

  const { config, configPath } = await loadConfigAsync(projectRoot);
  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const outputDir = config?.build?.outputDir || "dist";

  let count = 0;

  const swoffDir = join(projectRoot, "swoff");
  if (existsSync(swoffDir)) {
    rmSync(swoffDir, { recursive: true, force: true });
    log.info("Removed swoff/");
    count++;
  }

  const existingConfig = configFiles.find((f) => existsSync(join(projectRoot, f)));
  if (existingConfig) {
    rmSync(join(projectRoot, existingConfig));
    log.info(`Removed ${existingConfig}`);
    count++;
  }

  const versionPath = join(projectRoot, outputDir, "version.json");
  if (existsSync(versionPath)) {
    rmSync(versionPath);
    log.info(`Removed ${outputDir}/version.json`);
    count++;
  }

  if (count === 0) {
    log.info("No Swoff files found to remove.");
  } else {
    log.success("Swoff has been removed from the project.");
  }
}
