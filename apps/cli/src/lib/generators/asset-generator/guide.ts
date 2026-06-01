import { log } from "../../cli/logger.js";

export interface AssetGuideOptions {
  appName: string;
  themeColor: string;
  bgColor: string;
  outputDir: string;
  hasSplash: boolean;
}

export function printAssetGuide(opts: AssetGuideOptions) {
  log.normal("");
  log.help("To use these assets, add the following to your app:");

  if (opts.outputDir === "public") {
    log.normal("");
    log.help("In your HTML <head>:");
    log.help(`  <link rel="icon" type="image/x-icon" href="/favicon.ico">`);
    log.help(`  <link rel="apple-touch-icon" href="/apple-touch-icon.png">`);
    log.help(`  <link rel="manifest" href="/manifest.json">`);
    log.help(`  <meta name="theme-color" content="${opts.themeColor}">`);
    log.help(`  <meta name="apple-mobile-web-app-capable" content="yes">`);

    log.normal("");
    log.help("Open Graph / social sharing:");
    log.help(`  <meta property="og:image" content="/og-image.png">`);
    log.help(`  <meta property="og:image:width" content="1200">`);
    log.help(`  <meta property="og:image:height" content="630">`);
    log.help(`  <meta name="twitter:card" content="summary_large_image">`);

    if (opts.hasSplash) {
      log.normal("");
      log.help("Apple splash screens (add to <head>):");
      log.help('  <!-- iPad Pro 12.9" -->');
      log.help('  <link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)">');
      log.help('  <!-- iPad Pro 10.5" -->');
      log.help('  <link rel="apple-touch-startup-image" href="/splash-1668x2224.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)">');
      log.help('  <!-- iPad Mini / Air -->');
      log.help('  <link rel="apple-touch-startup-image" href="/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)">');
      log.help('  <!-- iPhone X/XS/11 Pro -->');
      log.help('  <link rel="apple-touch-startup-image" href="/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)">');
      log.help('  <!-- iPhone 6/7/8 Plus -->');
      log.help('  <link rel="apple-touch-startup-image" href="/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)">');
      log.help('  <!-- iPhone 6/7/8 -->');
      log.help('  <link rel="apple-touch-startup-image" href="/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)">');
      log.help('  <!-- iPhone 5/SE -->');
      log.help('  <link rel="apple-touch-startup-image" href="/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)">');
    }
  } else {
    log.normal("");
    log.help(`Assets written to "${opts.outputDir}/". Adapt the paths above to match your setup.`);
  }
}
