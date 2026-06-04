export interface AssetGuideOptions {
  appName: string;
  themeColor: string;
  bgColor: string;
  outputDir: string;
  hasSplash: boolean;
  hasMonochrome?: boolean;
  hasMsTile?: boolean;
  hasDarkMode?: boolean;
}

export function printAssetGuide(opts: AssetGuideOptions) {
  console.log("");
  console.log(
    `1. manifest.json written to ${opts.outputDir}/ with full assets integration.`,
  );
  console.log(
    `2. swoff-head-tags.html written to ${opts.outputDir}/ — copy its contents into your HTML <head>.`,
  );
  console.log("");
  console.log("\x1b[32m✓\x1b[0m Done.");
}
