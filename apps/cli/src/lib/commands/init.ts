/**
 * init command - creates swoff.config.json.
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { defaultInitConfig, deepMerge, type SwoffConfig } from "../shared/config-types.js";
import { detectFramework, type FrameworkName } from "../utils/detect-framework.js";

const FRAMEWORK_PRESETS: Record<string, Record<string, unknown>> = {
  nextjs: {
    features: {
      serviceWorker: {
        strategy: {
          default: "network-first",
          patterns: {
            "/_next/*": "cache-first",
            "/api/*": "network-first",
          },
        },
        navigation: {
          mode: "network-first",
        },
      },
    },
  },
  remix: {
    features: {
      serviceWorker: {
        strategy: {
          default: "network-first",
          ignoreQueryParams: ["_data"],
        },
        navigation: {
          mode: "network-first",
        },
      },
    },
  },
  astro: {
    features: {
      serviceWorker: {
        navigation: {
          mode: "default",
        },
      },
    },
  },
  nuxt: {
    features: {
      serviceWorker: {
        strategy: {
          default: "network-first",
        },
        navigation: {
          mode: "network-first",
        },
      },
    },
  },
  sveltekit: {
    features: {
      serviceWorker: {
        strategy: {
          default: "network-first",
        },
        navigation: {
          mode: "network-first",
        },
      },
    },
  },
};

export async function initCommand(projectRoot: string, framework?: string) {
  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const existingConfig = configFiles.find((f) =>
    existsSync(join(projectRoot, f)),
  );

  if (existingConfig) {
    log.warn(`Found existing ${existingConfig}. Skipping init.`);
    log.info("To reinitialize, delete the config file first.");
    return;
  }

  const detected = (framework || detectFramework(projectRoot)) as FrameworkName;
  const preset = FRAMEWORK_PRESETS[detected] || {};

  // Start with default config, deep-merge the preset
  const config = deepMerge(
    { ...defaultInitConfig, framework: detected as SwoffConfig["framework"] } as unknown as Record<string, unknown>,
    preset as unknown as Record<string, unknown>,
  ) as unknown as SwoffConfig;

  // Validate and adjust build output — ensure all build fields are present
  if (!config.build) config.build = defaultInitConfig.build;

  const configPath = join(projectRoot, "swoff.config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  log.info("Created swoff.config.json");

  log.success("Swoff initialized successfully!");
  log.normal("\nNext steps:");
  log.help("1. Review swoff.config.json and customize as needed");
  log.help("2. Run: npx @swoff/cli generate");
  log.help("3. Read the docs: https://swoff.netlify.app/docs");
}
