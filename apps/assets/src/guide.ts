export interface AssetGuideOptions {
  appName: string;
  themeColor: string;
  bgColor: string;
  outputDir: string;
  hasSplash: boolean;
}

export function printAssetGuide(opts: AssetGuideOptions) {
  console.log("");
  console.log("To use these assets, add the following to your app:");
  console.log("");

  if (opts.outputDir === "public") {
    console.log("In your HTML <head>:");
    console.log(`  <link rel="icon" type="image/x-icon" href="/favicon.ico">`);
    console.log(`  <link rel="apple-touch-icon" href="/apple-touch-icon.png">`);
    console.log(`  <link rel="manifest" href="/manifest.json">`);
    console.log(`  <meta name="theme-color" content="${opts.themeColor}">`);
    console.log(`  <meta name="apple-mobile-web-app-capable" content="yes">`);

    console.log("");
    console.log("Open Graph / social sharing:");
    console.log(`  <meta property="og:image" content="/og-image.png">`);
    console.log(`  <meta property="og:image:width" content="1200">`);
    console.log(`  <meta property="og:image:height" content="630">`);
    console.log(`  <meta name="twitter:card" content="summary_large_image">`);

    if (opts.hasSplash) {
      console.log("");
      console.log("Apple splash screens (add to <head>):");
      console.log('  <!-- iPad Pro 12.9" -->');
      console.log('  <link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)">');
      console.log('  <!-- iPad Pro 10.5" -->');
      console.log('  <link rel="apple-touch-startup-image" href="/splash-1668x2224.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)">');
      console.log('  <!-- iPad Mini / Air -->');
      console.log('  <link rel="apple-touch-startup-image" href="/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)">');
      console.log('  <!-- iPhone X/XS/11 Pro -->');
      console.log('  <link rel="apple-touch-startup-image" href="/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)">');
      console.log('  <!-- iPhone 6/7/8 Plus -->');
      console.log('  <link rel="apple-touch-startup-image" href="/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)">');
      console.log('  <!-- iPhone 6/7/8 -->');
      console.log('  <link rel="apple-touch-startup-image" href="/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)">');
      console.log('  <!-- iPhone 5/SE -->');
      console.log('  <link rel="apple-touch-startup-image" href="/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)">');
    }
  } else {
    console.log("");
    console.log(`Assets written to "${opts.outputDir}/". Adapt the paths above to match your setup.`);
  }
}
