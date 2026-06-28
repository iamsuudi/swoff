import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";
import { log } from "./lib/cli/logger.js";
import { showHelp } from "./lib/cli/help.js";
import { initCommand } from "./lib/commands/init.js";
import { generateCommand } from "./lib/commands/generate.js";
import { validateCommand } from "./lib/commands/validate.js";
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

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    version: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" },
    language: { type: "string" },
    debug: { type: "boolean" },
    yes: { type: "boolean", short: "y" },
  },
  allowPositionals: true,
});

const command = positionals[0];

async function main() {
  if (values.version) {
    console.log(`@swoff/cli ${cliVersion}`);
    process.exit(0);
  }

  if (!command || values.help) {
    showHelp(command);
    process.exit(0);
  }

  switch (command) {
    case "init": {
      await initCommand(projectRoot, !!values.yes);
      break;
    }
    case "generate": {
      await generateCommand(projectRoot, { language: values.language, debug: !!values.debug });
      break;
    }
    case "validate":
      await validateCommand(projectRoot);
      break;
    case "clean":
      await cleanCommand(projectRoot, { yes: !!values.yes });
      break;
    case "help":
      showHelp(positionals[1]);
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
