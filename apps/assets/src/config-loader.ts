import { existsSync, readFileSync } from "fs";
import { join } from "path";

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
