import { parseArgs } from "util";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { generateAssets } from "./generate.js";
import { printAssetGuide } from "./guide.js";
import { loadConfigFile, type ConfigFile } from "./config-loader.js";
import {
  DEFAULT_OUTPUT_DIR,
  DEFAULT_APP_NAME,
  DEFAULT_THEME_COLOR,
  DEFAULT_BG_COLOR,
} from "./constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8"),
    );
    return pkg.version || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

interface CliValues {
  source?: string;
  "output-dir"?: string;
  "app-name"?: string;
  "theme-color"?: string;
  "bg-color"?: string;
  "no-splash"?: boolean;
  monochrome?: boolean;
  "ms-tile-color"?: string;
  "dark-mode-theme"?: string;
  "dark-mode-bg"?: string;
  config?: string;
  version?: boolean;
  help?: boolean;
}

function mergeConfig(
  config: ConfigFile,
  values: CliValues,
): ConfigFile {
  const result: ConfigFile = { ...config };
  if (values.source) result.source = values.source;
  if (values["output-dir"]) result.outputDir = values["output-dir"];
  if (values["app-name"]) result.appName = values["app-name"];
  if (values["theme-color"]) result.themeColor = values["theme-color"];
  if (values["bg-color"]) result.backgroundColor = values["bg-color"];
  if (values["no-splash"] === true) result.noSplash = true;
  if (values.monochrome === true) result.monochrome = true;
  if (values["ms-tile-color"])
    result.msTileColor = values["ms-tile-color"];
  if (values["dark-mode-theme"]) {
    if (!result.darkMode) result.darkMode = { themeColor: "", backgroundColor: "" };
    result.darkMode.themeColor = values["dark-mode-theme"];
  }
  if (values["dark-mode-bg"]) {
    if (!result.darkMode) result.darkMode = { themeColor: "", backgroundColor: "" };
    result.darkMode.backgroundColor = values["dark-mode-bg"];
  }
  return result;
}

export async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      source: { type: "string" },
      "output-dir": { type: "string" },
      "app-name": { type: "string" },
      "theme-color": { type: "string" },
      "bg-color": { type: "string" },
      "no-splash": { type: "boolean" },
      monochrome: { type: "boolean" },
      "ms-tile-color": { type: "string" },
      "dark-mode-theme": { type: "string" },
      "dark-mode-bg": { type: "string" },
      config: { type: "string" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  if (values.version) {
    console.log(`@swoff/assets ${getVersion()}`);
    process.exit(0);
  }

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const configFile = loadConfigFile(process.cwd(), values.config);
  const merged = mergeConfig(configFile, values);

  if (!merged.source) {
    console.error("Error: --source is required.\n");
    printHelp();
    process.exit(1);
  }

  const result = await generateAssets({
    source: merged.source,
    outputDir: merged.outputDir || DEFAULT_OUTPUT_DIR,
    appName: merged.appName || DEFAULT_APP_NAME,
    themeColor: merged.themeColor || DEFAULT_THEME_COLOR,
    bgColor: merged.backgroundColor || DEFAULT_BG_COLOR,
    appleSplash: !merged.noSplash,
    monochrome: merged.monochrome,
    msTileColor: merged.msTileColor,
    darkMode: merged.darkMode,
    shortcuts: merged.shortcuts,
    onProgress: (msg) => process.stdout.write(`\r\x1b[K  \x1b[2m→\x1b[0m ${msg}`),
  });

  process.stdout.write("\r\x1b[K");
  console.log(`\x1b[32m✓\x1b[0m Generated ${result.files.length} PWA assets`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) console.warn(`  Warning: ${w}`);
  }

  printAssetGuide({
    appName: merged.appName || DEFAULT_APP_NAME,
    themeColor: merged.themeColor || DEFAULT_THEME_COLOR,
    bgColor: merged.backgroundColor || DEFAULT_BG_COLOR,
    outputDir: merged.outputDir || DEFAULT_OUTPUT_DIR,
    hasSplash: !merged.noSplash,
  });
}

function printHelp(): void {
  console.log("@swoff/assets — Universal PWA asset generator");
  console.log("");
  console.log("Usage: npx @swoff/assets --source <path> [options]");
  console.log("");
  console.log("Required:");
  console.log("  --source <path>           Source image (SVG, PNG, JPG)");
  console.log("");
  console.log("Options:");
  console.log("  --output-dir <path>       Output directory [default: public]");
  console.log(
    "  --app-name <name>         App name for manifest.json [default: My App]",
  );
  console.log("  --theme-color <hex>       Theme color [default: #000000]");
  console.log(
    "  --bg-color <hex>          Background color [default: #ffffff]",
  );
  console.log("  --no-splash               Skip Apple splash screens");
  console.log(
    "  --monochrome              Generate monochrome silhouette icons",
  );
  console.log(
    "  --ms-tile-color <hex>     Generate Microsoft tile icons + browserconfig.xml",
  );
  console.log(
    "  --dark-mode-theme <hex>   Dark mode theme color (generates dark icons)",
  );
  console.log(
    "  --dark-mode-bg <hex>      Dark mode background color [default: #121212]",
  );
  console.log(
    "  --config <path>           Path to swoff-assets.json config file",
  );
  console.log("  -v, --version             Show version");
  console.log("  -h, --help                Show this help");
  console.log("");
  console.log("Config file (swoff-assets.json):");
  console.log(
    '  { "source": "./logo.svg", "monochrome": true, "msTileColor": "#000" }',
  );
  console.log("  CLI flags override config file values.");
  console.log("");
  console.log("Examples:");
  console.log("  npx @swoff/assets --source ./logo.svg");
  console.log(
    "  npx @swoff/assets --source ./logo.svg --monochrome --ms-tile-color #000",
  );
  console.log(
    "  npx @swoff/assets --source ./logo.svg --dark-mode-theme #fff --dark-mode-bg #121212",
  );
}
