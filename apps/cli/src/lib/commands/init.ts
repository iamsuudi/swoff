import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { intro, outro, text, confirm, select, isCancel, log } from "@clack/prompts";
import { detectFramework, type FrameworkName } from "../utils/detect-framework.js";
import { buildMinimalConfig, type WizardAnswers } from "../config/minimal-config.js";

const FRAMEWORK_PRESETS: Record<string, Record<string, unknown>> = {
  nextjs: {
    swOutput: "public",
    navMode: "ssr",
    defaultStrategy: "network-first",
    patterns: { "/_next/static/*": "cache-first" },
    ignoreQueryParams: ["_rsc"],
  },
  remix: {
    navMode: "ssr",
    defaultStrategy: "network-first",
    ignoreQueryParams: ["_data"],
  },
  astro: {
    navMode: "ssr",
  },
  nuxt: {
    navMode: "ssr",
    defaultStrategy: "network-first",
  },
  sveltekit: {
    navMode: "ssr",
    defaultStrategy: "network-first",
  },
  "react-spa": {
    swOutput: "dist",
    navMode: "spa",
  },
  "tanstack-start-react": {
    swOutput: ".output/public",
    navMode: "ssr",
    defaultStrategy: "network-first",
    patterns: { "/_serverFn/*": "network-only" },
  },
};

const STRATEGIES = [
  { value: "cache-first", label: "Cache First" },
  { value: "network-first", label: "Network First" },
  { value: "stale-while-revalidate", label: "Stale While Revalidate" },
  { value: "cache-only", label: "Cache Only" },
  { value: "network-only", label: "Network Only" },
  { value: "reactive", label: "Reactive" },
] as const;

const ALL_FRAMEWORKS = [
  "nextjs", "remix", "tanstack-start-react", "astro", "nuxt",
  "sveltekit", "react-spa", "vue", "svelte",
  "vanilla", "no-bundler",
] as const;

export async function initCommand(projectRoot: string, yesMode?: boolean, frameworkOverride?: string) {
  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const existingConfig = configFiles.find((f) => existsSync(join(projectRoot, f)));

  if (existingConfig) {
    log.warn(`Found existing ${existingConfig}. Aborting.`);
    log.info("Delete it first or run in a different directory.");
    return;
  }

  const detected = frameworkOverride && ALL_FRAMEWORKS.includes(frameworkOverride as never)
    ? (frameworkOverride as (typeof ALL_FRAMEWORKS)[number])
    : detectFramework(projectRoot);
  if (frameworkOverride && detected === frameworkOverride) {
    log.info(`Framework: ${detected} (override)`);
  }
  const preset = FRAMEWORK_PRESETS[detected] || {};

  if (yesMode) {
    const answers: WizardAnswers = {
      framework: detected,
      swOutput: (preset.swOutput as string) || "dist",
      swFilename: "sw",
      navMode: (preset.navMode as "spa" | "ssr" | "default") || "default",
      fallback: "/offline",
      defaultStrategy: (preset.defaultStrategy as string) || "cache-first",
      patterns: preset.patterns as Record<string, string> | undefined,
      pwaEnabled: false,
      authEnabled: false,
      mutationEnabled: false,
      tagInvalidationEnabled: false,
      graphqlEnabled: false,
      serverPushEnabled: false,
      pushNotificationsEnabled: false,
      precacheDir: preset.swOutput ? (preset.swOutput as string) : "dist",
      precachePrefix: "/",
    };
    writeConfig(projectRoot, answers);
    return;
  }

  intro("swoff configuration");

  const framework = await select({
    message: "Framework",
    options: ALL_FRAMEWORKS.map((f) => ({
      value: f,
      label: f === detected ? `${f} (detected)` : f,
    })),
    initialValue: detected,
  });
  if (isCancel(framework)) process.exit(0);

  const activePreset = FRAMEWORK_PRESETS[framework as string] || {};

  const swOutput = await text({
    message: "SW output directory",
    initialValue: (activePreset.swOutput as string) || "dist",
  });
  if (isCancel(swOutput)) process.exit(0);

  const swFilename = await text({
    message: "Service worker filename",
    initialValue: "sw",
  });
  if (isCancel(swFilename)) process.exit(0);

  const navMode = await select({
    message: "Navigation mode",
    options: [
      { value: "spa", label: "SPA" },
      { value: "ssr", label: "SSR" },
      { value: "default", label: "Default" },
    ],
    initialValue: (activePreset.navMode as string) || "default",
  });
  if (isCancel(navMode)) process.exit(0);

  const fallback = await text({
    message: "Offline fallback path",
    initialValue: "/offline",
  });
  if (isCancel(fallback)) process.exit(0);

  const defaultStrategy = await select({
    message: "Default caching strategy",
    options: [...STRATEGIES],
    initialValue: (activePreset.defaultStrategy as string) || "cache-first",
  });
  if (isCancel(defaultStrategy)) process.exit(0);

  const pwaEnabled = await confirm({ message: "Enable PWA install prompt?", initialValue: false });
  if (isCancel(pwaEnabled)) process.exit(0);

  let authType: string | undefined;
  const authEnabled = await confirm({ message: "Enable authentication?", initialValue: false });
  if (isCancel(authEnabled)) process.exit(0);
  if (authEnabled) {
    authType = (await select({
      message: "Authentication type",
      options: [
        { value: "cookie", label: "Cookie" },
        { value: "bearer", label: "Bearer" },
        { value: "custom", label: "Custom" },
      ],
      initialValue: "cookie",
    })) as string | undefined;
    if (isCancel(authType)) process.exit(0);
  }

  const mutationEnabled = await confirm({ message: "Enable mutation queue (offline mutations)?", initialValue: false });
  if (isCancel(mutationEnabled)) process.exit(0);

  const tagInvalidationEnabled = await confirm({ message: "Enable tag invalidation?", initialValue: false });
  if (isCancel(tagInvalidationEnabled)) process.exit(0);

  const graphqlEnabled = await confirm({ message: "Enable GraphQL support?", initialValue: false });
  if (isCancel(graphqlEnabled)) process.exit(0);

  const serverPushEnabled = await confirm({ message: "Enable server push?", initialValue: false });
  if (isCancel(serverPushEnabled)) process.exit(0);

  const pushNotificationsEnabled = await confirm({ message: "Enable push notifications?", initialValue: false });
  if (isCancel(pushNotificationsEnabled)) process.exit(0);

  const precacheDir = await text({
    message: "Directory to precache (leave empty to skip)",
    initialValue: (activePreset.swOutput as string) || "dist",
  });
  if (isCancel(precacheDir)) process.exit(0);

  let precachePrefix = "/";
  if (precacheDir) {
    precachePrefix = (await text({
      message: "Precache URL prefix",
      initialValue: "/",
    })) as string;
    if (isCancel(precachePrefix)) process.exit(0);
  }

  log.info("");
  log.info("─".repeat(40));
  log.info("Summary");
  log.info(`  Framework:    ${framework}`);
  log.info(`  SW output:    ${swOutput}/${swFilename}.js`);
  log.info(`  Fallback:     ${fallback}`);
  log.info(`  Navigation:   ${navMode}`);
  log.info(`  Strategy:     ${defaultStrategy}`);
  if (pwaEnabled) log.info("  PWA:          enabled");
  if (authEnabled) log.info(`  Auth:         ${authType}`);
  if (mutationEnabled) log.info("  Mutation Q:   enabled");
  if (tagInvalidationEnabled) log.info("  Tag Inval:    enabled");
  if (graphqlEnabled) log.info("  GraphQL:      enabled");
  if (serverPushEnabled) log.info("  Server Push:  enabled");
  if (pushNotificationsEnabled) log.info("  Push Notif:   enabled");
  if (precacheDir) log.info(`  Precache:     ${precacheDir} → ${precachePrefix}`);
  log.info("─".repeat(40));
  log.info("");

  const write = await confirm({ message: "Write swoff.config.json?", initialValue: true });
  if (isCancel(write) || !write) {
    outro("Aborted.");
    return;
  }

  const answers: WizardAnswers = {
    framework: framework as string,
    swOutput: swOutput as string,
    swFilename: swFilename as string,
    navMode: navMode as "spa" | "ssr" | "default",
    fallback: fallback as string,
    defaultStrategy: defaultStrategy as string,
    patterns: activePreset.patterns as Record<string, string> | undefined,
    pwaEnabled: pwaEnabled as boolean,
    authEnabled: authEnabled as boolean,
    authType,
    mutationEnabled: mutationEnabled as boolean,
    tagInvalidationEnabled: tagInvalidationEnabled as boolean,
    graphqlEnabled: graphqlEnabled as boolean,
    serverPushEnabled: serverPushEnabled as boolean,
    pushNotificationsEnabled: pushNotificationsEnabled as boolean,
    precacheDir: precacheDir as string | undefined,
    precachePrefix: precachePrefix as string | undefined,
  };

  writeConfig(projectRoot, answers);
}

function writeConfig(projectRoot: string, answers: WizardAnswers) {
  const config = buildMinimalConfig(answers);
  const configPath = join(projectRoot, "swoff.config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  outro(`Config written to swoff.config.json (${Object.keys(config).length} top-level keys)`);
}
