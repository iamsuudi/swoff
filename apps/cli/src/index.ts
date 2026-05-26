/**
 * Swoff CLI - Main Entry Point
 *
 * Usage:
 *   swoff init          Initialize Swoff in current directory
 *   swoff generate      Generate service worker and files
 *   swoff validate      Validate swoff.config.json
 *   swoff add <feature> Add specific feature files
 *   swoff info          Show configuration summary
 *   swoff clean         Remove old versioned SW files
 *   swoff --help        Show help
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "./lib/cli/logger.js";
import { showHelp } from "./lib/cli/help.js";
import { initCommand } from "./lib/commands/init.js";
import { generateCommand } from "./lib/commands/generate.js";
import { validateCommand } from "./lib/commands/validate.js";
import { addCommand } from "./lib/commands/add.js";
import { infoCommand } from "./lib/commands/info.js";
import { cleanCommand } from "./lib/commands/clean.js";

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

const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

async function main() {
  if (command === "--version" || command === "-v") {
    console.log(`@swoff/cli ${cliVersion}`);
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
      await initCommand(projectRoot, framework);
      break;
    }
    case "generate": {
      const swOnly = options.includes("--sw-only");
      const filesOnly = options.includes("--files-only");
      await generateCommand(projectRoot, { swOnly, filesOnly });
      break;
    }
    case "validate":
      await validateCommand(projectRoot);
      break;
    case "add": {
      const feature = options[0];
      if (!feature) {
        log.error("Please specify a feature to add");
        log.info("Usage: swoff add <feature>");
        log.info("Features: mutation-queue, pwa, cross-tab, auth, tag-invalidation, background-sync");
        process.exit(1);
      }
      await addCommand(projectRoot, feature);
      break;
    }
    case "info":
      await infoCommand(projectRoot, options[0]);
      break;
    case "clean":
      await cleanCommand(projectRoot);
      break;
    case "help":
    case "--help":
    case "-h":
      showHelp(options[0]);
      break;
    default:
      log.error(`Unknown command: ${command}`);
      log.info('Run "swoff help" for available commands');
      process.exit(1);
  }
}

main().catch((err) => {
  log.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
