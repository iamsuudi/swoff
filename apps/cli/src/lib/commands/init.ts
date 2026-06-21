/**
 * init command - creates swoff.config.json.
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import {
  defaultInitConfig,
  deepMerge,
  type SwoffConfig,
} from "../shared/config-types.js";
import {
  detectFramework,
  type FrameworkName,
} from "../utils/detect-framework.js";

const FRAMEWORK_PRESETS: Record<string, Record<string, unknown>> = {
  nextjs: {
    build: {
      outputDir: "public",
    },
    features: {
      serviceWorker: {
        strategy: {
          default: "network-first",
          patterns: {
            "/_next/static/*": "cache-first",
          },
          ignoreQueryParams: ["_rsc"],
        },
        navigation: {
          mode: "ssr",
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
          mode: "ssr",
        },
      },
    },
  },
  astro: {
    features: {
      serviceWorker: {
        navigation: {
          mode: "ssr",
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
          mode: "ssr",
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
          mode: "ssr",
        },
      },
    },
  },
  "react-spa": {
    build: {
      outputDir: "dist",
    },
    features: {
      serviceWorker: {
        navigation: {
          mode: "spa",
        },
      },
    },
  },
  "tanstack-start-react": {
    build: {
      outputDir: ".output/public",
    },
    features: {
      serviceWorker: {
        strategy: {
          default: "network-first",
          patterns: {
            "/_serverFn/*": "network-only",
          },
        },
        navigation: {
          mode: "ssr",
        },
      },
    },
  },
  laravel: {
    build: {
      outputDir: "public",
    },
    features: {
      serviceWorker: {
        navigation: {
          mode: "ssr",
        },
        strategy: {
          default: "network-first",
        },
      },
    },
  },
  django: {
    build: {
      outputDir: "static",
    },
    features: {
      serviceWorker: {
        navigation: {
          mode: "ssr",
        },
        strategy: {
          default: "network-first",
        },
      },
    },
  },
  flask: {
    build: {
      outputDir: "static",
    },
    features: {
      serviceWorker: {
        navigation: {
          mode: "ssr",
        },
        strategy: {
          default: "network-first",
        },
      },
    },
  },
  rails: {
    build: {
      outputDir: "public",
    },
    features: {
      serviceWorker: {
        navigation: {
          mode: "ssr",
        },
        strategy: {
          default: "network-first",
        },
      },
    },
  },
  go: {
    build: {
      outputDir: "static",
    },
    features: {
      serviceWorker: {
        navigation: {
          mode: "ssr",
        },
        strategy: {
          default: "network-first",
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
    {
      ...defaultInitConfig,
      framework: detected as SwoffConfig["framework"],
    } as unknown as Record<string, unknown>,
    preset as unknown as Record<string, unknown>,
  ) as unknown as SwoffConfig;

  // Validate and adjust build output — ensure all build fields are present
  if (!config.build) config.build = defaultInitConfig.build;

  // Auto-populate precacheDirs from outputDir so users get directory precaching out of the box
  const cfgBuild = config.build;
  if (!cfgBuild.precacheDirs || Object.keys(cfgBuild.precacheDirs).length === 0) {
    cfgBuild.precacheDirs = { [cfgBuild.outputDir]: { prefix: "/" } };
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
