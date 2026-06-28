import { rmSync, existsSync } from "fs";
import { join } from "path";
import { intro, outro, confirm, isCancel, log } from "@clack/prompts";

export async function cleanCommand(projectRoot: string, options?: { yes?: boolean }) {
  const swoffDir = join(projectRoot, "swoff");
  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const existingConfig = configFiles.find((f) => existsSync(join(projectRoot, f)));

  const hasSwoffDir = existsSync(swoffDir);
  if (!hasSwoffDir && !existingConfig) {
    log.info("No Swoff files found to remove.");
    return;
  }

  if (!options?.yes) {
    intro("swoff clean");
    const shouldRemove = await confirm({ message: "Really remove all swoff files?" });
    if (isCancel(shouldRemove) || !shouldRemove) {
      outro("Aborted.");
      return;
    }
  }

  if (hasSwoffDir) {
    rmSync(swoffDir, { recursive: true, force: true });
  }

  if (existingConfig) {
    rmSync(join(projectRoot, existingConfig));
  }

  outro("Cleaned");
}
