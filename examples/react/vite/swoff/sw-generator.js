import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
const template = readFileSync(join(__dirname, "sw-template.js"), "utf8");

let sw = template.replace(
  "// [[CACHE_NAME]]",
  `CACHE_NAME = 'sw-v${pkg.version}'`,
);
sw = sw.replace(
  "// [[ASSETS_LIST]]",
  `ASSETS_TO_CACHE = ['/', '/index.html']`,
);

writeFileSync(join(__dirname, "..", "dist", `sw-v${pkg.version}.js`), sw);
writeFileSync(
  join(__dirname, "..", "dist", "version.json"),
  JSON.stringify(
    {
      version: pkg.version,
      minSupportedVersion: pkg.minSupportedVersion || "0.0.0",
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
