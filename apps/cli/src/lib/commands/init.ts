/**
 * init command - creates swoff.config.json.
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import { log } from "../cli/logger.js";
import {
  defaultInitConfig,
  defaultPwaAssets,
  type SwoffConfig,
} from "../shared/config-types.js";
import { detectFramework } from "../utils/detect-framework.js";

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function initCommand(projectRoot: string, framework?: string) {
  // log.header("Initializing Swoff");

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
    configVersion: defaultInitConfig.configVersion,
    enabled: defaultInitConfig.enabled,
    framework: detected as SwoffConfig["framework"],
    build: defaultInitConfig.build,
    features: {
      ...defaultInitConfig.features,
      pwa: {
        ...defaultInitConfig.features.pwa,
        assets: { ...defaultPwaAssets },
      },
    },
  };

  const logoPath = await ask(
    "Path to your app logo (SVG, PNG, JPG) — leave empty for placeholder:",
  );
  if (logoPath) {
    config.features.pwa.assets.source = logoPath;
    log.info("Logo source saved.");
  }

  const configPath = join(projectRoot, "swoff.config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  log.info("Created swoff.config.json");

  log.success("Swoff initialized successfully!");
  log.normal("\nNext steps:");
  log.help("1. Review swoff.config.json and customize as needed");
  log.help("2. Run: npx @swoff/cli generate");
  log.help("3. Read the docs: https://swoff.netlify.app/docs");
}
