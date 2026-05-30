/**
 * clean command - removes Swoff from the project (swoff/ dir + config).
 */

import { rmSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";

export async function cleanCommand(projectRoot: string) {
  log.header("Removing Swoff");

  const configFiles = ["swoff.config.json", "swoff.config.js"];
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

  if (count === 0) {
    log.info("No Swoff files found to remove.");
  } else {
    log.success("Swoff has been removed from the project.");
  }
}
