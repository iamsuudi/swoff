import { writeFileSync, existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { loadConfigAsync } from "../config/loader.js";
import { resolveVersion, isVersionEnabled } from "./sw-build-utils.js";
import { assembleSW } from "./sw-sections/assemble-sw.js";
import { createRequire } from "module";

interface GeneratorOptions {
  projectRoot?: string;
  configPath?: string;
}

export async function generateSW(options: GeneratorOptions = {}): Promise<{ version: string; outputFile: string }> {
  const optProjectRoot = options.projectRoot || process.cwd();
  const optConfigPath = options.configPath;

  const pkgPath = join(optProjectRoot, "package.json");
  let pkg = { version: "1.0.0" };

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    } catch {
      console.log("Could not read package.json, using default version");
    }
  }

  const { config, configSource } = await loadConfigAsync(optProjectRoot, optConfigPath);

  const v = config.features.serviceWorker.version;
  const versionEnabled = isVersionEnabled(v);
  const version = resolveVersion(v, pkg.version || "1.0.0");
  let sw = assembleSW(config, version, optProjectRoot);
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
  const outputFile = versionEnabled ? `${swFilename}-v${version}.js` : `${swFilename}.js`;

  try {
    writeFileSync(join(outputDir, outputFile), sw);
    if (versionEnabled) {
      writeFileSync(
        join(outputDir, "version.json"),
        JSON.stringify(
          {
            version,
            generatedAt: new Date().toISOString(),
            configSource,
          },
          null,
          2,
        ),
      );
    }

    console.log(`${outputDir}/${outputFile}`);
  } catch (err) {
    console.log(`Error writing files: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { version, outputFile };
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
