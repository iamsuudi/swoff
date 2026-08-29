import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { DEFAULT_DARK_MODE_BG } from "./constants.js";

export interface ConfigFile {
  source?: string;
  outputDir?: string;
  appName?: string;
  shortName?: string;
  description?: string;
  startUrl?: string;
  themeColor?: string;
  backgroundColor?: string;
  noSplash?: boolean;
  monochrome?: boolean;
  msTileColor?: string;
  darkMode?: {
    themeColor: string;
    backgroundColor: string;
  };
  orientation?: string;
  scope?: string;
  lang?: string;
  categories?: string[];
  shortcuts?: Array<{
    name: string;
    url: string;
    description?: string;
    icons?: Array<{ src: string; sizes: string }>;
  }>;
}

export function loadConfigFile(projectRoot: string, configPathArg?: string): ConfigFile {
  const configPath = configPathArg || join(projectRoot, "swoff-assets.json");
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as ConfigFile;
  } catch {
    console.warn(`Warning: could not parse ${configPath}, ignoring.`);
    return {};
  }
}

export interface CliFlagValues {
  source?: string;
  "output-dir"?: string;
  "app-name"?: string;
  "short-name"?: string;
  description?: string;
  "start-url"?: string;
  "theme-color"?: string;
  "bg-color"?: string;
  "no-splash"?: boolean;
  monochrome?: boolean;
  "ms-tile-color"?: string;
  "dark-mode-theme"?: string;
  "dark-mode-bg"?: string;
  orientation?: string;
  scope?: string;
  lang?: string;
  categories?: string;
}

/**
 * Applies CLI flags over a loaded config file. Dark mode is kept consistent:
 * a missing theme inherits the regular theme color and a missing background
 * falls back to the documented dark background default.
 */
export function mergeConfig(config: ConfigFile, values: CliFlagValues): ConfigFile {
  const result: ConfigFile = { ...config };
  if (values.source) result.source = values.source;
  if (values["output-dir"]) result.outputDir = values["output-dir"];
  if (values["app-name"]) result.appName = values["app-name"];
  if (values["short-name"]) result.shortName = values["short-name"];
  if (values.description) result.description = values.description;
  if (values["start-url"]) result.startUrl = values["start-url"];
  if (values["theme-color"]) result.themeColor = values["theme-color"];
  if (values["bg-color"]) result.backgroundColor = values["bg-color"];
  if (values["no-splash"] === true) result.noSplash = true;
  if (values.monochrome === true) result.monochrome = true;
  if (values["ms-tile-color"]) result.msTileColor = values["ms-tile-color"];
  if (values.orientation) result.orientation = values.orientation;
  if (values.scope) result.scope = values.scope;
  if (values.lang) result.lang = values.lang;
  if (values.categories) {
    result.categories = values.categories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const darkTheme = values["dark-mode-theme"];
  const darkBg = values["dark-mode-bg"];
  const existing = result.darkMode;
  const existingTheme = existing && existing.themeColor ? existing.themeColor : undefined;
  const existingBg = existing && existing.backgroundColor ? existing.backgroundColor : undefined;
  const wantsDark =
    darkTheme !== undefined ||
    darkBg !== undefined ||
    existingTheme !== undefined ||
    existingBg !== undefined;

  if (wantsDark) {
    const themeColor = darkTheme ?? existingTheme ?? result.themeColor ?? DEFAULT_DARK_MODE_BG;
    const backgroundColor = darkBg ?? existingBg ?? DEFAULT_DARK_MODE_BG;
    result.darkMode = { themeColor, backgroundColor };
  }

  return result;
}