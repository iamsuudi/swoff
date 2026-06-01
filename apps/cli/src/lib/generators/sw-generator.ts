import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadConfigAsync } from "../config/loader.js";
import { assembleSW } from "./sw-sections/assemble-sw.js";

interface GeneratorOptions {
  projectRoot?: string;
  configPath?: string;
  onStatus?: (msg: string) => void;
}

function resolveVersion(config: { features: { serviceWorker: { version: string; minSupportedVersion: string } } }, pkgVersion: string): string {
  const v = config.features.serviceWorker.version;
  if (v === "hash") return "0.0.0";
  if (v === "package") return pkgVersion || "1.0.0";
  return v;
}

export async function generateSW(options: GeneratorOptions = {}): Promise<{ version: string; outputFile: string }> {
  const optProjectRoot = options.projectRoot || process.cwd();
  const optConfigPath = options.configPath;
  const status = options.onStatus || console.log;

  const pkgPath = join(optProjectRoot, "package.json");
  let pkg = { version: "1.0.0" };

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      status("Could not read package.json, using default version");
    }
  }

  const { config, configSource } = await loadConfigAsync(optProjectRoot, optConfigPath);

  if (!config.enabled) {
    status("Swoff config generation disabled. Using custom code mode.");
    return { version: "", outputFile: "" };
  }

  const v = config.features.serviceWorker.version;
  const versionEnabled = v !== "hash";
  const version = resolveVersion(config, pkg.version || "1.0.0");
  const sw = assembleSW(config, version, optProjectRoot);

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
            minSupportedVersion: config.features.serviceWorker.minSupportedVersion,
            generatedAt: new Date().toISOString(),
            configEnabled: config.enabled,
            configSource,
          },
          null,
          2,
        ),
      );
    }

    status(`✓ ${outputDir}/${outputFile}`);
  } catch (err) {
    status(`Error writing files: ${err instanceof Error ? err.message : String(err)}`);
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
    const ttyStatus = process.stdout.isTTY
      ? (msg: string) => {
          const cols = process.stdout.columns || 80;
          process.stdout.write(`\r${" ".repeat(cols - 1)}\r  ${msg}`);
        }
      : (msg: string) => console.log(`  ${msg}`);

    console.log("Generating service worker...");
    await generateSW({ projectRoot, configPath, onStatus: ttyStatus });
    process.stdout.write("\n");
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default { generateSW };
