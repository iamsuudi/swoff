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
    usage: "swoff init [--framework react-spa|nextjs|remix|tanstack-start-react|astro|nuxt|sveltekit|vue|svelte|vanilla]",
    examples: ["swoff init", "swoff init --framework react-spa"],
  },
  generate: {
    description: "Generate supporting files (swoff/)",
    usage: "swoff generate [--language ts|js]",
    examples: ["swoff generate"],
  },
  validate: {
    description: "Validate swoff.config.json",
    usage: "swoff validate",
    examples: ["swoff validate"],
  },
  add: {
    description: "Add specific feature files (mutation-queue, pwa, cross-tab, auth, background-sync, graphql, push-notification, htmx, php)",
    usage: "swoff add <feature1>[,<feature2>,...]",
    examples: ["swoff add pwa", "swoff add auth,graphql", "swoff add htmx"],
  },
  clean: {
    description: "Remove Swoff from the project (swoff/, config, version.json). Use --yes to skip confirmation",
    usage: "swoff clean [--yes|-y]",
    examples: ["swoff clean", "swoff clean --yes"],
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
