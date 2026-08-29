import { parseArgs } from "util";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { generateAssets } from "./generate.js";
import { printAssetGuide } from "./guide.js";
import { loadConfigFile, mergeConfig } from "./config-loader.js";
import {
  DEFAULT_OUTPUT_DIR,
  DEFAULT_APP_NAME,
  DEFAULT_THEME_COLOR,
  DEFAULT_BG_COLOR,
} from "./constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getSchemaJson(): string {
  return readFileSync(
    new URL("./schema/swoff-assets.schema.json", import.meta.url),
    "utf8",
  );
}

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

export async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      source: { type: "string" },
      "output-dir": { type: "string" },
      "app-name": { type: "string" },
      "short-name": { type: "string" },
      description: { type: "string" },
      "start-url": { type: "string" },
      "theme-color": { type: "string" },
      "bg-color": { type: "string" },
      "no-splash": { type: "boolean" },
      monochrome: { type: "boolean" },
      "ms-tile-color": { type: "string" },
      "dark-mode-theme": { type: "string" },
      "dark-mode-bg": { type: "string" },
      orientation: { type: "string" },
      scope: { type: "string" },
      lang: { type: "string" },
      categories: { type: "string" },
      config: { type: "string" },
      "print-schema": { type: "boolean" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  if (values.version) {
    console.log(`@swoff/assets ${getVersion()}`);
    process.exit(0);
  }

  if (values["print-schema"]) {
    console.log(getSchemaJson());
    process.exit(0);
  }

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const configFile = loadConfigFile(process.cwd(), values.config);
  const merged = mergeConfig(configFile, values);

  if (!merged.appName && !merged.source) {
    console.error("Error: --app-name or --source is required.\n");
    printHelp();
    process.exit(1);
  }

  const result = await generateAssets({
    ...(merged.source ? { source: merged.source } : {}),
    outputDir: merged.outputDir || DEFAULT_OUTPUT_DIR,
    appName: merged.appName || DEFAULT_APP_NAME,
    shortName: merged.shortName,
    description: merged.description,
    startUrl: merged.startUrl,
    themeColor: merged.themeColor || DEFAULT_THEME_COLOR,
    bgColor: merged.backgroundColor || DEFAULT_BG_COLOR,
    appleSplash: !merged.noSplash,
    monochrome: merged.monochrome,
    msTileColor: merged.msTileColor,
    darkMode: merged.darkMode,
    orientation: merged.orientation,
    scope: merged.scope,
    lang: merged.lang,
    categories: merged.categories,
    shortcuts: merged.shortcuts,
    onProgress: (msg) => process.stdout.write(`\r\x1b[K  \x1b[2m→\x1b[0m ${msg}`),
  });

  process.stdout.write("\r\x1b[K");
  const mode = merged.source ? "from source" : "from wordmark";
  console.log(`\x1b[32m✓\x1b[0m Generated ${result.files.length} PWA assets ${mode}`);
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
  console.log("Usage: npx @swoff/assets --app-name <name> [options]");
  console.log("");
  console.log("A wordmark icon is generated from --app-name when --source is omitted.");
  console.log("");
  console.log("Options:");
  console.log("  --source <path>           Source image (SVG, PNG, JPG). Omit to auto-generate a wordmark");
  console.log("  --output-dir <path>       Output directory [default: public]");
  console.log(
    "  --app-name <name>         App name for manifest + wordmark [default: My App]",
  );
  console.log(
    "  --short-name <name>       Short name for manifest [default: app-name]",
  );
  console.log(
    "  --description <text>      Description for manifest",
  );
  console.log(
    "  --start-url <path>        Start URL for manifest [default: /]",
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
    "  --orientation <value>     manifest orientation [default: portrait-primary]",
  );
  console.log(
    "  --scope <path>            manifest scope [default: /]",
  );
  console.log(
    "  --lang <tag>              manifest lang [default: en-US]",
  );
  console.log(
    "  --categories <list>       manifest categories, comma separated",
  );
  console.log(
    "  --config <path>           Path to swoff-assets.json config file",
  );
  console.log("  --print-schema            Print the swoff-assets.json JSON schema");
  console.log("  -v, --version             Show version");
  console.log("  -h, --help                Show this help");
  console.log("");
  console.log("Config file (swoff-assets.json):");
  console.log(
    '  { "appName": "Foo", "monochrome": true, "msTileColor": "#000", "lang": "en-US" }',
  );
  console.log("  CLI flags override config file values. See --print-schema for the full shape.");
  console.log("");
  console.log("Examples:");
  console.log("  npx @swoff/assets --app-name Foo");
  console.log(
    "  npx @swoff/assets --source ./logo.svg --monochrome --ms-tile-color #000",
  );
  console.log(
    "  npx @swoff/assets --app-name Foo --dark-mode-theme #fff --dark-mode-bg #121212 --categories enterprise,productivity",
  );
}