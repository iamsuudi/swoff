import { writeFileSync, existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { loadConfigAsync } from "../config/loader.js";
import { assembleSW } from "./sw-sections/assemble-sw.js";
import { createRequire } from "module";

interface GeneratorOptions {
  projectRoot?: string;
  configPath?: string;
}

export async function generateSW(options: GeneratorOptions = {}): Promise<{ outputFile: string }> {
  const optProjectRoot = options.projectRoot || process.cwd();
  const optConfigPath = options.configPath;

  const { config } = await loadConfigAsync(optProjectRoot, optConfigPath);

  let sw = assembleSW(config, optProjectRoot);
  let apiBase = "";
  const configJsPath = join(optProjectRoot, "swoff", "config.js");
  if (existsSync(configJsPath)) {
    try {
      const _require = createRequire(import.meta.url);
      const configMod = _require(configJsPath);
      apiBase = configMod.API_BASE || "";
    } catch {}
  } else {
    const configTsPath = join(optProjectRoot, "swoff", "config.ts");
    if (existsSync(configTsPath)) {
      const content = await readFile(configTsPath, "utf8");
      const match = content.match(/export\s+const\s+API_BASE\s*=\s*"([^"]+)"/);
      apiBase = match ? match[1] : "";
    }
  }
  if (sw.includes("SWOFF_API_BASE")) {
    sw = sw.replace(/SWOFF_API_BASE/g, apiBase);
  }

  const outputDir = join(optProjectRoot, config.build.outputDir);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const swFilename = config.build.swFilename;
  const outputFile = `${swFilename}.js`;

  try {
    writeFileSync(join(outputDir, outputFile), sw);
    console.log(`${outputDir}/${outputFile}`);
  } catch (err) {
    console.log(`Error writing files: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { outputFile };
}

if (fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], "file:"))) {
  const args = process.argv.slice(2);
  const projectRootIdx = args.indexOf("--project-root");
  const configPathIdx = args.indexOf("--config-path");
  const projectRoot = projectRootIdx !== -1 ? args[projectRootIdx + 1] : undefined;
  const configPath = configPathIdx !== -1 ? args[configPathIdx + 1] : undefined;

  (async () => {
    console.log("Generating service worker...");
    await generateSW({ projectRoot, configPath });
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default { generateSW };
