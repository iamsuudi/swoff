import { rmSync, existsSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import { log } from "../cli/logger.js";

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export interface CleanOptions {
  yes?: boolean;
}

export async function cleanCommand(
  projectRoot: string,
  options: CleanOptions = {},
) {
  const swoffDir = join(projectRoot, "swoff");
  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const existingConfig = configFiles.find((f) =>
    existsSync(join(projectRoot, f)),
  );

  const hasSwoffDir = existsSync(swoffDir);
  if (!hasSwoffDir && !existingConfig) {
    log.info("No Swoff files found to remove.");
    return;
  }

  log.header("Removing Swoff");

  const targets: string[] = [];
  if (hasSwoffDir) targets.push("swoff/");
  if (existingConfig) targets.push(existingConfig);

  if (!options.yes) {
    const answer = await ask(`Remove ${targets.join(" and ")}? [y/N]`);
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      log.info("Aborted.");
      return;
    }
  }

  if (hasSwoffDir) {
    rmSync(swoffDir, { recursive: true, force: true });
    log.info("Removed swoff/");
  }

  if (existingConfig) {
    rmSync(join(projectRoot, existingConfig));
    log.info(`Removed ${existingConfig}`);
  }

  log.success("Swoff has been removed from the project.");
}
