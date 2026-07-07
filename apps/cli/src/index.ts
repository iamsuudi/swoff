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
    framework: { type: "string" },
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
      if (values.language) log.warn("--language is not applicable to the init command");
      if (values.debug) log.warn("--debug is not applicable to the init command");
      await initCommand(projectRoot, !!values.yes, values.framework as string | undefined);
      break;
    }
    case "generate": {
      if (values.yes) log.warn("--yes is not applicable to the generate command");
      if (values.framework) log.warn("--framework is not applicable to the generate command");
      await generateCommand(projectRoot, { language: values.language, debug: !!values.debug });
      break;
    }
    case "validate": {
      if (values.yes) log.warn("--yes is not applicable to the validate command");
      if (values.framework) log.warn("--framework is not applicable to the validate command");
      if (values.language) log.warn("--language is not applicable to the validate command");
      if (values.debug) log.warn("--debug is not applicable to the validate command");
      await validateCommand(projectRoot);
      break;
    }
    case "clean": {
      if (values.framework) log.warn("--framework is not applicable to the clean command");
      if (values.language) log.warn("--language is not applicable to the clean command");
      if (values.debug) log.warn("--debug is not applicable to the clean command");
      await cleanCommand(projectRoot, { yes: !!values.yes });
      break;
    }
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
