/**
 * init command - creates swoff.config.json and swoff/ directory.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { defaultInitConfig, type SwoffConfig } from "../shared/config-types.js";
import { detectFramework } from "../utils/detect-framework.js";

export async function initCommand(projectRoot: string, framework?: string) {
  log.header("Initializing Swoff");

  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const existingConfig = configFiles.find((f) =>
    existsSync(join(projectRoot, f)),
  );

  if (existingConfig) {
    log.warn(`Found existing ${existingConfig}. Skipping init.`);
    log.info("To reinitialize, delete the config file first.");
    return;
  }

  const detected = framework || detectFramework(projectRoot);
  const config = {
    $schema: defaultInitConfig.$schema,
    enabled: defaultInitConfig.enabled,
    framework: detected as SwoffConfig["framework"],
    build: defaultInitConfig.build,
    features: defaultInitConfig.features,
  };

  const configPath = join(projectRoot, "swoff.config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  log.info("Created swoff.config.json");

  const dirs = ["swoff", "swoff/hooks"];
  for (const dir of dirs) {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      log.info(`Created ${dir}/`);
    }
  }

  log.success("Swoff initialized successfully!");
  log.normal("\nNext steps:");
  log.help("1. Review swoff.config.json and customize as needed");
  log.help("2. Run: npx @swoff/cli generate");
  log.help("3. Read the docs: https://swoff.netlify.app/docs");
}
