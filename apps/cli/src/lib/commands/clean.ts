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

  if (!options.yes) {
    const answer = await ask("Remove Swoff files? [y/N]");
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      log.info("Aborted.");
      return;
    }
  }

  if (hasSwoffDir) {
    rmSync(swoffDir, { recursive: true, force: true });
  }

  if (existingConfig) {
    rmSync(join(projectRoot, existingConfig));
  }

  log.success("Cleaned");
}
