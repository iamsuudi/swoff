/**
 * Command registry and help display.
 */

import { colors } from "./colors.js";
import { log } from "./logger.js";

export interface CommandDef {
  description: string;
  usage: string;
  examples: string[];
}

export const commands: Record<string, CommandDef> = {
  init: {
    description: "Initialize Swoff in current directory",
    usage: "swoff init [--framework react|vue|svelte|vanilla]",
    examples: ["swoff init", "swoff init --framework react"],
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
    examples: ["swoff add pwa", "swoff add mutation-queue"],
  },
  info: {
    description: "Show Swoff configuration summary or per-feature details",
    usage: "swoff info [feature]",
    examples: ["swoff info", "swoff info mutation-queue", "swoff info auth"],
  },
  clean: {
    description: "Remove Swoff from the project (swoff/, config, version.json)",
    usage: "swoff clean",
    examples: ["swoff clean"],
  },
  help: {
    description: "Show help information",
    usage: "swoff help [command]",
    examples: ["swoff help", "swoff help init"],
  },
};

export function showHelp(commandName?: string) {
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
