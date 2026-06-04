import { parseArgs } from "util";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { generateAssets } from "./generate.js";
import { printAssetGuide } from "./guide.js";

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

export async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      source: { type: "string" },
      "output-dir": { type: "string", default: "public" },
      "app-name": { type: "string", default: "My App" },
      "theme-color": { type: "string", default: "#000000" },
      "bg-color": { type: "string", default: "#ffffff" },
      "no-splash": { type: "boolean", default: false },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  if (values.version) {
    console.log(`@swoff/assets ${getVersion()}`);
    process.exit(0);
  }

  if (values.help || !values.source) {
    console.log("Usage: @swoff/assets --source <path> [options]");
    console.log("");
    console.log("Generate PWA assets (icons, splash screens, favicons, OG image, manifest.json).");
    console.log("");
    console.log("Options:");
    console.log("  --source <path>       Source image (SVG, PNG, JPG) [required]");
    console.log("  --output-dir <path>   Output directory [default: public]");
    console.log("  --app-name <name>     App name for manifest.json [default: My App]");
    console.log("  --theme-color <hex>   Theme color [default: #000000]");
    console.log("  --bg-color <hex>      Background color [default: #ffffff]");
    console.log("  --no-splash           Skip Apple splash screens");
    console.log("  -v, --version         Show version");
    console.log("  -h, --help            Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  npx @swoff/assets --source ./logo.svg");
    console.log("  npx @swoff/assets --source ./logo.svg --theme-color #663399 --no-splash");
    process.exit(values.help ? 0 : 1);
  }

  const result = await generateAssets({
    source: values.source,
    outputDir: values["output-dir"],
    appName: values["app-name"],
    themeColor: values["theme-color"],
    bgColor: values["bg-color"],
    appleSplash: !values["no-splash"],
  });

  console.log(`\nGenerated ${result.files.length} PWA assets`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) console.warn(`Warning: ${w}`);
  }

  printAssetGuide({
    appName: values["app-name"],
    themeColor: values["theme-color"],
    bgColor: values["bg-color"],
    outputDir: values["output-dir"],
    hasSplash: !values["no-splash"],
  });
}
