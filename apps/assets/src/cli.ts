import { parseArgs } from "util";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { generateAssets } from "./generate.js";
import { printAssetGuide } from "./guide.js";
import { loadConfigFile, type ConfigFile } from "./config-loader.js";

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

function mergeConfig(config: ConfigFile, values: Record<string, unknown>): ConfigFile {
  const result: ConfigFile = { ...config };
  if (values.source) result.source = String(values.source);
  if (values["output-dir"]) result.outputDir = String(values["output-dir"]);
  if (values["app-name"]) result.appName = String(values["app-name"]);
  if (values["theme-color"]) result.themeColor = String(values["theme-color"]);
  if (values["bg-color"]) result.backgroundColor = String(values["bg-color"]);
  if (values["no-splash"] === true) result.noSplash = true;
  if (values["no-splash"] === false && config) result.noSplash = false;
  if (values.monochrome === true) result.monochrome = true;
  if (values["ms-tile-color"]) result.msTileColor = String(values["ms-tile-color"]);
  if (values["dark-mode-theme"]) {
    result.darkMode = result.darkMode || { themeColor: "", backgroundColor: "#121212" };
    result.darkMode.themeColor = String(values["dark-mode-theme"]);
  }
  if (values["dark-mode-bg"]) {
    result.darkMode = result.darkMode || { themeColor: "#ffffff", backgroundColor: "" };
    result.darkMode.backgroundColor = String(values["dark-mode-bg"]);
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

  const configFile = loadConfigFile(process.cwd());
  const merged = mergeConfig(configFile, values);

  if (!merged.source) {
    console.error("Error: --source is required.\n");
    printHelp();
    process.exit(1);
  }

  const result = await generateAssets({
    source: merged.source,
    outputDir: merged.outputDir || "public",
    appName: merged.appName || "My App",
    themeColor: merged.themeColor || "#000000",
    bgColor: merged.backgroundColor || "#ffffff",
    appleSplash: !merged.noSplash,
    monochrome: merged.monochrome,
    msTileColor: merged.msTileColor,
    darkMode: merged.darkMode,
    shortcuts: merged.shortcuts,
  });

  console.log(`\nGenerated ${result.files.length} PWA assets`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) console.warn(`Warning: ${w}`);
  }

  printAssetGuide({
    appName: merged.appName || "My App",
    themeColor: merged.themeColor || "#000000",
    bgColor: merged.backgroundColor || "#ffffff",
    outputDir: merged.outputDir || "public",
    hasSplash: !merged.noSplash,
    hasMonochrome: merged.monochrome,
    hasMsTile: !!merged.msTileColor,
    hasDarkMode: !!merged.darkMode,
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
  console.log("  --app-name <name>         App name for manifest.json [default: My App]");
  console.log("  --theme-color <hex>       Theme color [default: #000000]");
  console.log("  --bg-color <hex>          Background color [default: #ffffff]");
  console.log("  --no-splash               Skip Apple splash screens");
  console.log("  --monochrome              Generate monochrome silhouette icons");
  console.log("  --ms-tile-color <hex>     Generate Microsoft tile icons + browserconfig.xml");
  console.log("  --dark-mode-theme <hex>   Dark mode theme color (generates dark icons)");
  console.log("  --dark-mode-bg <hex>      Dark mode background color [default: #121212]");
  console.log("  --config <path>           Path to swoff-assets.json config file");
  console.log("  -v, --version             Show version");
  console.log("  -h, --help                Show this help");
  console.log("");
  console.log("Config file (swoff-assets.json):");
  console.log('  { "source": "./logo.svg", "monochrome": true, "msTileColor": "#000" }');
  console.log("  CLI flags override config file values.");
  console.log("");
  console.log("Examples:");
  console.log("  npx @swoff/assets --source ./logo.svg");
  console.log("  npx @swoff/assets --source ./logo.svg --monochrome --ms-tile-color #000");
  console.log("  npx @swoff/assets --source ./logo.svg --dark-mode-theme #fff --dark-mode-bg #121212");
}
