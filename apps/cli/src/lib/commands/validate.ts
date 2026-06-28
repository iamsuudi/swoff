/**
 * validate command - validates swoff.config.json against expected schema.
 */

import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";

export async function validateCommand(projectRoot: string) {
  // log.header("Validating Swoff Configuration");

  const { config, configPath, configSource } =
    await loadConfigAsync(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Validating ${configPath}...`);

  const errors = validateConfig(config);

  if (errors.length > 0) {
    log.error(`Validation failed with ${errors.length} error(s):`);
    errors.forEach((e) => log.help(`  - ${e}`));
    return;
  }

  log.success("Configuration is valid!");
  log.info("\nConfig summary:");
  log.help(
    `Default strategy: ${config.features.serviceWorker.strategy.default}`,
  );
  log.help(`Auto activate: ${config.features.serviceWorker.autoActivate}`);
  log.help(
    `Features enabled: ${Object.entries(config.features)
      .filter(([k, v]) => {
        if (k === "serviceWorker") return false;
        if (typeof v === "object" && v !== null)
          return (v as Record<string, unknown>).enabled === true;
        return typeof v === "boolean" && v === true;
      })
      .map(([k]) => k)
      .join(", ")}`,
  );
}
