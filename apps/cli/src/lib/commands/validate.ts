/**
 * validate command - validates swoff.config.json against expected schema.
 */

import { log } from "../cli/logger.js";
import { loadConfig } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";

export async function validateCommand(projectRoot: string) {
  log.header("Validating Swoff Configuration");

  const { config, configPath, configSource } = loadConfig(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Validating ${configPath}...`);

  const errors = validateConfig(config as unknown as Record<string, unknown>);

  if (errors.length > 0) {
    log.error(`Validation failed with ${errors.length} error(s):`);
    errors.forEach((e) => log.help(`  - ${e}`));
    return;
  }

  log.success("Configuration is valid!");
  log.info("\nConfig summary:");
  log.help(`Version: ${config.version}`);
  log.help(`Default strategy: ${config.serviceWorker.defaultStrategy}`);
  log.help(
    `Features enabled: ${Object.entries(config.features)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(", ")}`,
  );
}
