import { readFileSync, writeFileSync, existsSync } from "fs";

export interface HtmlMeta {
  appName: string;
  themeColor: string;
  bgColor: string;
  ogImagePath: string;
  appleTouchIconPath: string;
  splashPaths: string[];
  faviconSvgPath: string;
  faviconIcoPath: string;
}

const SPLASH_MEDIA: Record<string, string> = {
  "splash-2048x2732": "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
  "splash-1668x2224": "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)",
  "splash-1536x2048": "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
  "splash-1125x2436": "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
  "splash-1242x2208": "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
  "splash-750x1334": "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
  "splash-640x1136": "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
};

export function patchHtml(htmlPath: string, meta: HtmlMeta): void {
  if (!existsSync(htmlPath)) return;
  let html = readFileSync(htmlPath, "utf-8");
  const insertBefore = "</head>";
  if (!html.includes(insertBefore)) return;

  const tags: string[] = [];

  if (meta.faviconSvgPath && !html.includes('rel="icon"') && !html.includes("rel='icon'")) {
    tags.push(`  <link rel="icon" type="image/svg+xml" href="${meta.faviconSvgPath}">`);
  }
  if (meta.faviconIcoPath && !html.includes("favicon.ico")) {
    tags.push(`  <link rel="icon" type="image/x-icon" href="${meta.faviconIcoPath}">`);
  }
  if (meta.appleTouchIconPath && !html.includes("apple-touch-icon")) {
    tags.push(`  <link rel="apple-touch-icon" href="${meta.appleTouchIconPath}">`);
  }
  if (!html.includes("apple-mobile-web-app-capable")) {
    tags.push(`  <meta name="apple-mobile-web-app-capable" content="yes">`);
  }
  if (meta.themeColor && !html.includes('name="theme-color"') && !html.includes("name='theme-color'")) {
    tags.push(`  <meta name="theme-color" content="${meta.themeColor}">`);
  }
  if (meta.bgColor && !html.includes('name="background-color"')) {
    tags.push(`  <meta name="background-color" content="${meta.bgColor}">`);
  }
  if (meta.ogImagePath) {
    if (!html.includes('property="og:image"')) {
      tags.push(`  <meta property="og:image" content="${meta.ogImagePath}">`);
      tags.push(`  <meta property="og:image:width" content="1200">`);
      tags.push(`  <meta property="og:image:height" content="630">`);
    }
    if (!html.includes('name="twitter:card"') && !html.includes("name='twitter:card'")) {
      tags.push(`  <meta name="twitter:card" content="summary_large_image">`);
    }
    if (!html.includes('name="twitter:image"')) {
      tags.push(`  <meta name="twitter:image" content="${meta.ogImagePath}">`);
    }
  }
  if (meta.appName) {
    if (!html.includes('property="og:title"') && !html.includes("name='twitter:title'")) {
      tags.push(`  <meta property="og:title" content="${meta.appName}">`);
      tags.push(`  <meta name="twitter:title" content="${meta.appName}">`);
    }
  }
  for (const splash of meta.splashPaths) {
    const name = splash.replace(/\.png$/, "").replace(/^\//, "");
    const media = SPLASH_MEDIA[name];
    if (media && !html.includes(name)) {
      tags.push(`  <link rel="apple-touch-startup-image" href="${splash}" media="${media}">`);
    }
  }

  if (tags.length > 0) {
    html = html.replace(insertBefore, `${tags.join("\n")}\n${insertBefore}`);
    writeFileSync(htmlPath, html);
  }
}
