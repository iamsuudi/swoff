/**
 * Swoff CLI - Main Entry Point
 *
 * Command-line interface for managing Swoff in your project.
 *
 * Usage:
 *   swoff init          Initialize Swoff in current directory
 *   swoff generate      Generate service worker and files
 *   swoff validate      Validate swoff.config.json
 *   swoff add <feature> Add specific feature files
 *   swoff --help        Show help
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, "..");
const projectRoot = process.cwd();

const cliVersion = (() => {
  try {
    const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
})();

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset}  ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset}  ${msg}`),
  help: (msg: string) => console.log(`  ${colors.cyan}${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`),
};

const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

interface CommandDef {
  description: string;
  usage: string;
  examples: string[];
}

const commands: Record<string, CommandDef> = {
  init: {
    description: "Initialize Swoff in current directory",
    usage: "swoff init [--framework react-vite|nextjs|vue-vite]",
    examples: ["swoff init", "swoff init --framework react-vite"],
  },
  generate: {
    description: "Generate service worker and supporting files",
    usage: "swoff generate [--sw-only|--files-only]",
    examples: ["swoff generate", "swoff generate --sw-only", "swoff generate --files-only"],
  },
  validate: {
    description: "Validate swoff.config.json",
    usage: "swoff validate",
    examples: ["swoff validate"],
  },
  add: {
    description: "Add specific feature files",
    usage: "swoff add <feature>",
    examples: ["swoff add offline", "swoff add pwa", "swoff add mutation-queue"],
  },
  help: {
    description: "Show help information",
    usage: "swoff help [command]",
    examples: ["swoff help", "swoff help init"],
  },
};

function showHelp(commandName?: string) {
  if (commandName && commands[commandName]) {
    const cmd = commands[commandName];
    log.header(`Swoff ${commandName} Command`);
    console.log(`Description: ${cmd.description}`);
    console.log(`\nUsage: ${cmd.usage}`);
    console.log(`\nExamples:`);
    cmd.examples.forEach((ex: string) => console.log(`  ${ex}`));
  } else {
    log.header("Swoff CLI");
    console.log(`${colors.dim}Swoff${colors.reset} - Offline-first web apps made easy\n`);
    console.log(`Usage: ${colors.cyan}swoff <command> [options]${colors.reset}\n`);
    console.log("Commands:");
    Object.entries(commands).forEach(([name, cmd]) => {
      console.log(`  ${colors.green}${name.padEnd(12)}${colors.reset} ${cmd.description}`);
    });
    console.log(`\nRun ${colors.cyan}swoff help <command>${colors.reset} for more details on a specific command.`);
  }
}

async function initCommand(framework?: string) {
  log.header("Initializing Swoff");

  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const existingConfig = configFiles.find((f) => existsSync(join(projectRoot, f)));

  if (existingConfig) {
    log.warn(`Found existing ${existingConfig}. Skipping init.`);
    log.info("To reinitialize, delete the config file first.");
    return;
  }

  const defaultConfig: {
    $schema: string;
    enabled: boolean;
    version: string;
    minSupportedVersion: string;
    serviceWorker: {
      autoRegister: boolean;
      autoUpdate: boolean;
      defaultStrategy: string;
      strategies: Record<string, string>;
    };
    features: Record<string, boolean>;
    build: { outputDir: string; swFilename: string };
  } = {
    $schema: "https://swoff.netlify.app/schema/v1.json",
    enabled: true,
    version: "from-package",
    minSupportedVersion: "1.0.0",
    serviceWorker: {
      autoRegister: true,
      autoUpdate: false,
      defaultStrategy: "cache-first",
      strategies: {
        "/api/*": "network-first",
        "/static/*": "cache-first",
      },
    },
    features: {
      versionedSw: true,
      offlineReads: true,
      mutationQueue: false,
      backgroundSync: false,
      pwa: true,
      auth: false,
      crossTabSync: true,
      tagInvalidation: true,
      clientRegistration: true,
      indexeddb: false,
    },
    build: {
      outputDir: "dist",
      swFilename: "sw",
    },
  };

  if (framework === "react-vite" || framework === "nextjs") {
    defaultConfig.features.mutationQueue = true;
    defaultConfig.serviceWorker.strategies = {
      "/api/*": "network-first",
      "/static/*": "cache-first",
      "/assets/*": "cache-first",
    };
  } else if (framework === "vue-vite") {
    defaultConfig.features.mutationQueue = true;
    defaultConfig.serviceWorker.strategies = {
      "/api/*": "network-first",
      "/static/*": "cache-first",
      "/assets/*": "cache-first",
    };
  }

  const configPath = join(projectRoot, "swoff.config.json");
  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  log.success(`Created swoff.config.json`);

  const dirs = ["swoff"];
  for (const dir of dirs) {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      log.info(`Created ${dir}/`);
    }
  }

  log.success("Swoff initialized successfully!");

  log.info(`Next steps:`);
  log.help("1. Review swoff.config.json and customize as needed");
  log.help("2. Run: swoff generate");
  log.help("3. Import the SW injector in your app entry point:");
  log.help("   import { initServiceWorker, shouldRegisterSW } from './swoff/sw-injector.js';");
  log.help("   if (shouldRegisterSW()) initServiceWorker();");
  log.help("4. Read the docs: https://swoff.netlify.app/docs");
}

interface GenerateOptions {
  swOnly?: boolean;
  filesOnly?: boolean;
  language?: string;
}

async function generateCommand(options: GenerateOptions = {}) {
  const { swOnly = false, filesOnly = false, language } = options;

  log.header("Generating Swoff Files");

  const configFiles = ["swoff.config.json", "swoff.config.js"];
  let config: Record<string, unknown> | null = null;
  let configPath: string | null = null;

  for (const file of configFiles) {
    const path = join(projectRoot, file);
    if (existsSync(path)) {
      configPath = path;
      if (file.endsWith(".json")) {
        config = JSON.parse(readFileSync(path, "utf8"));
      }
      break;
    }
  }

  if (!config) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Using config: ${configPath}`);

  const detectedLang = language ?? detectProjectLanguage();
  log.info(`Detected project language: ${detectedLang}`);

  if (!filesOnly) {
    log.info("Generating service worker...");
    try {
      await runGenerator("sw-generator.js", [
        "--project-root", projectRoot,
        "--package-dir", packageDir,
        "--config-path", configPath!,
      ]);
    } catch (err: unknown) {
      log.error(`Service worker generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!swOnly) {
    log.info("Generating supporting files...");
    try {
      await runGenerator("swoff-files-generator.js", [
        "--project-root", projectRoot,
        "--package-dir", packageDir,
        "--language", detectedLang,
        "--config-path", configPath!,
      ]);
    } catch (err: unknown) {
      log.error(`File generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  log.success("Generation complete!");

  log.info(`Next steps:`);
  log.help("1. Import the SW injector in your app entry point:");
  log.help("   import { initServiceWorker, shouldRegisterSW } from './swoff/sw-injector.js';");
  log.help("   if (shouldRegisterSW()) initServiceWorker();");
  log.help("2. Use the fetch wrapper for API calls:");
  log.help("   import { fetchWithCache } from './swoff/fetch-wrapper.js';");
  log.help("   const data = await fetchWithCache('/api/data', { tags: ['data'] }).then(r => r.json());");
  log.help("3. Add to your build script:");
  log.help("   \"build\": \"your-build && node swoff/sw-generator.js\"");
  log.help("4. Read the docs: https://swoff.netlify.app/docs");
}

function runGenerator(generatorName: string, extraArgs: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const generatorPath = join(packageDir, "dist", "lib", "generators", generatorName);

    if (!existsSync(generatorPath)) {
      reject(new Error(`Generator not found: ${generatorPath}`));
      return;
    }

    const proc = spawn("node", [generatorPath, ...extraArgs], {
      cwd: projectRoot,
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Generator exited with code ${code}`));
    });
    proc.on("error", (err) => reject(err));
  });
}

async function validateCommand() {
  log.header("Validating Swoff Configuration");

  const configFiles = ["swoff.config.json", "swoff.config.js"];
  let config: Record<string, unknown> | null = null;
  let configPath: string | null = null;

  for (const file of configFiles) {
    const path = join(projectRoot, file);
    if (existsSync(path)) {
      configPath = path;
      if (file.endsWith(".json")) {
        try {
          config = JSON.parse(readFileSync(path, "utf8"));
        } catch (err: unknown) {
          log.error(`Invalid JSON in ${file}: ${err instanceof Error ? err.message : String(err)}`);
          return;
        }
      }
      break;
    }
  }

  if (!config) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Validating ${configPath}...`);

  const errors: string[] = [];

  const requiredFields = ["enabled", "version", "serviceWorker", "features", "build"];
  const missingFields = requiredFields.filter((field) => config![field] === undefined || config![field] === null);
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(", ")}`);
  }

  if (config!.serviceWorker) {
    const sw = config!.serviceWorker as Record<string, unknown>;
    const validStrategies = ["cache-first", "network-first", "stale-while-revalidate", "cache-only", "network-only"];

    if (sw.autoRegister !== undefined && typeof sw.autoRegister !== "boolean") {
      errors.push(`serviceWorker.autoRegister must be a boolean`);
    }
    if (sw.autoUpdate !== undefined && typeof sw.autoUpdate !== "boolean") {
      errors.push(`serviceWorker.autoUpdate must be a boolean`);
    }

    if (sw.defaultStrategy && !validStrategies.includes(sw.defaultStrategy as string)) {
      errors.push(`Invalid defaultStrategy "${sw.defaultStrategy}". Must be one of: ${validStrategies.join(", ")}`);
    }

    if (sw.strategies && typeof sw.strategies === "object") {
      const strategies = sw.strategies as Record<string, string>;
      for (const [pattern, strategy] of Object.entries(strategies)) {
        if (!validStrategies.includes(strategy)) {
          errors.push(`Invalid strategy "${strategy}" for pattern "${pattern}". Must be one of: ${validStrategies.join(", ")}`);
        }
      }
    }
  }

  if (config!.features) {
    const features = config!.features as Record<string, unknown>;
    const knownFeatures = ["versionedSw", "offlineReads", "mutationQueue", "backgroundSync", "pwa", "auth", "crossTabSync", "tagInvalidation", "clientRegistration", "indexeddb"];
    for (const [key, value] of Object.entries(features)) {
      if (!knownFeatures.includes(key)) {
        errors.push(`Unknown feature "${key}"`);
      }
      if (typeof value !== "boolean") {
        errors.push(`Feature "${key}" must be a boolean, got ${typeof value}`);
      }
    }
  }

  if (config!.version && typeof config!.version === "string" && config!.version !== "from-package") {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(config!.version as string)) {
      errors.push(`Invalid version "${config!.version}". Must be "from-package" or semver (e.g., "1.0.0")`);
    }
  }

  if (config!.minSupportedVersion && typeof config!.minSupportedVersion === "string") {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(config!.minSupportedVersion as string)) {
      errors.push(`Invalid minSupportedVersion "${config!.minSupportedVersion}". Must be semver (e.g., "1.0.0")`);
    }
  }

  if (config!.build) {
    const build = config!.build as Record<string, unknown>;
    if (build.outputDir && typeof build.outputDir !== "string") {
      errors.push(`build.outputDir must be a string`);
    }
    if (build.swFilename && typeof build.swFilename !== "string") {
      errors.push(`build.swFilename must be a string`);
    }
  }

  if (config!.database) {
    const db = config!.database as Record<string, unknown>;
    if (db.name && typeof db.name !== "string") {
      errors.push(`database.name must be a string`);
    }
    if (db.name && typeof db.name === "string" && !/^[a-zA-Z0-9-_]+$/.test(db.name as string)) {
      errors.push(`database.name "${db.name}" must match pattern ^[a-zA-Z0-9-_]+$`);
    }
    if (db.stores && !Array.isArray(db.stores)) {
      errors.push(`database.stores must be an array`);
    }
    if (db.stores && Array.isArray(db.stores)) {
      for (const store of db.stores as string[]) {
        if (typeof store !== "string") {
          errors.push(`database.stores must contain only strings`);
          break;
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(store)) {
          errors.push(`database.store "${store}" must match pattern ^[a-zA-Z0-9-_]+$`);
        }
      }
    }
  }

  if (errors.length > 0) {
    log.error(`Validation failed with ${errors.length} error(s):`);
    errors.forEach((e) => log.help(`  - ${e}`));
    return;
  }

  log.success("Configuration is valid!");
  log.info(`\nConfig summary:`);
  log.help(`Version: ${config!.version as string}`);
  log.help(`Default strategy: ${(config!.serviceWorker as Record<string, unknown>).defaultStrategy as string}`);
  log.help(
    `Features enabled: ${Object.entries(config!.features as Record<string, unknown>)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(", ")}`,
  );
}

async function addCommand(feature: string) {
  log.header(`Adding ${feature} feature`);

  const featureMap: Record<string, Record<string, boolean>> = {
    offline: { offlineReads: true },
    "mutation-queue": { mutationQueue: true },
    mutationqueue: { mutationQueue: true },
    pwa: { pwa: true },
    "cross-tab": { crossTabSync: true },
    crosstab: { crossTabSync: true },
    auth: { auth: true },
    "tag-invalidation": { tagInvalidation: true },
    taginvalidation: { tagInvalidation: true },
    "background-sync": { backgroundSync: true },
    backgroundsync: { backgroundSync: true },
    indexeddb: { indexeddb: true },
  };

  const configUpdate = featureMap[feature.toLowerCase()];

  if (!configUpdate) {
    log.error(`Unknown feature: ${feature}`);
    log.info(`Available features: offline, mutation-queue, pwa, cross-tab, auth, tag-invalidation, background-sync, indexeddb`);
    return;
  }

  let config: Record<string, unknown> | null = null;
  let configPath: string = join(projectRoot, "swoff.config.json");

  for (const file of ["swoff.config.json", "swoff.config.js"]) {
    const path = join(projectRoot, file);
    if (existsSync(path)) {
      configPath = path;
      if (file.endsWith(".json")) {
        config = JSON.parse(readFileSync(path, "utf8"));
      }
      break;
    }
  }

  if (!config) {
    log.warn("No config found. Creating new config with feature...");
    config = {
      $schema: "https://swoff.netlify.app/schema/v1.json",
      enabled: true,
      version: "from-package",
      minSupportedVersion: "0.0.0",
      serviceWorker: {
        autoRegister: true,
        autoUpdate: false,
        defaultStrategy: "cache-first",
        strategies: {},
      },
      features: {
        versionedSw: true,
        offlineReads: false,
        mutationQueue: false,
        backgroundSync: false,
        pwa: false,
        auth: false,
        crossTabSync: false,
        tagInvalidation: true,
        clientRegistration: true,
        indexeddb: false,
      },
      build: {
        outputDir: "dist",
        swFilename: "sw",
      },
    };
  }

  config.features = { ...config.features as Record<string, unknown>, ...configUpdate };
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  log.success(`Updated swoff.config.json with ${feature} feature`);

  await generateCommand({ swOnly: false, filesOnly: false });
  log.success(`${feature} feature added successfully!`);
}

function detectProjectLanguage(): "ts" | "js" {
  if (existsSync(join(projectRoot, "tsconfig.json"))) return "ts";

  const pkgPath = join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) return "ts";
    } catch {}
  }

  const srcDir = join(projectRoot, "src");
  if (existsSync(srcDir)) {
    const tsFiles = ["ts", "tsx"].some((ext) => {
      try {
        return readdirSync(srcDir, { withFileTypes: true }).some(
          (entry) =>
            entry.isFile() && entry.name.endsWith(`.${ext}`),
        );
      } catch {
        return false;
      }
    });
    if (tsFiles) return "ts";
  }

  return "js";
}

async function main() {
  if (command === "--version" || command === "-v") {
    console.log(cliVersion);
    process.exit(0);
  }

  if (!command) {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case "init": {
      const frameworkIdx = options.indexOf("--framework");
      const framework = frameworkIdx !== -1 ? options[frameworkIdx + 1] : undefined;
      await initCommand(framework);
      break;
    }
    case "generate": {
      const swOnly = options.includes("--sw-only");
      const filesOnly = options.includes("--files-only");
      await generateCommand({ swOnly, filesOnly });
      break;
    }
    case "validate":
      await validateCommand();
      break;
    case "add": {
      const feature = options[0];
      if (!feature) {
        log.error("Please specify a feature to add");
        log.info("Usage: swoff add <feature>");
        log.info("Features: offline, mutation-queue, pwa, cross-tab, auth, tag-invalidation, background-sync, indexeddb");
        process.exit(1);
      }
      await addCommand(feature);
      break;
    }
    case "help":
    case "--help":
    case "-h":
      showHelp(options[0]);
      break;
    default:
      log.error(`Unknown command: ${command}`);
      log.info(`Run "swoff help" for available commands`);
      process.exit(1);
  }
}

main().catch((err) => {
  log.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});