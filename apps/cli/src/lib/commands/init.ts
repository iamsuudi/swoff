import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  intro,
  outro,
  text,
  confirm,
  select,
  isCancel,
  log,
} from "@clack/prompts";
import {
  detectFramework,
  type FrameworkName,
} from "../utils/detect-framework.js";
import {
  buildMinimalConfig,
  type WizardAnswers,
} from "../config/minimal-config.js";
import type { PrecacheDirConfig } from "../shared/config-types.js";

const FRAMEWORK_PRESETS: Record<string, Record<string, unknown>> = {
  react: {
    swOutput: "dist",
    navMode: "spa",
    precacheDirs: {
      dist: {
        prefix: "/",
        stripExtensions: [".html"],
        stripSuffixes: ["index"],
      },
    },
  },
  qwik: {
    navMode: "spa",
  },
  preact: {
    swOutput: "dist",
    navMode: "spa",
  },
  angular: {
    swOutput: "dist",
    navMode: "spa",
  },
  solid: {
    swOutput: "dist",
    navMode: "spa",
  },
  lit: {
    navMode: "spa",
  },
  alpine: {
    navMode: "spa",
  },
  marko: {
    navMode: "spa",
  },
  stimulus: {
    navMode: "spa",
  },
  jquery: {
    navMode: "spa",
  },
  htmx: {
    navMode: "spa",
  },
  vue: {
    swOutput: "dist",
    navMode: "spa",
    precacheDirs: {
      dist: {
        prefix: "/",
        stripExtensions: [".html"],
        stripSuffixes: ["index"],
      },
    },
  },
  svelte: {
    swOutput: "dist",
    navMode: "spa",
    precacheDirs: {
      dist: {
        prefix: "/",
        stripExtensions: [".html"],
        stripSuffixes: ["index"],
      },
    },
  },
  nextjs: {
    swOutput: "public",
    navMode: "ssr",
    defaultStrategy: "network-first",
    patterns: { "/_next/static/*": "cache-first" },
    ignoreQueryParams: ["_rsc"],
    precacheDirs: {
      ".next/static": {
        prefix: "/_next/static",
      },
      ".next/server/app": {
        prefix: "/",
        matchExtensions: [".html"],
        stripExtensions: [".html"],
        stripSuffixes: ["index"],
      },
    },
  },
  remix: {
    navMode: "ssr",
    defaultStrategy: "network-first",
    ignoreQueryParams: ["_data"],
  },
  astro: {
    navMode: "ssr",
  },
  quasar: {
    navMode: "spa",
  },
  vitepress: {
    navMode: "default",
  },
  nuxt: {
    navMode: "ssr",
    defaultStrategy: "network-first",
  },
  sveltekit: {
    swOutput: ".svelte-kit/output/client",
    navMode: "ssr",
    defaultStrategy: "network-first",
    precacheDirs: {
      ".svelte-kit/output/client": {
        prefix: "/",
        stripExtensions: [".html"],
        stripSuffixes: ["index"],
      },
    },
  },
  vike: {
    swOutput: "dist/client",
    navMode: "ssr",
    defaultStrategy: "network-first",
    precacheDirs: {
      "dist/client": {
        prefix: "/",
        stripExtensions: [".html"],
        stripSuffixes: ["index"],
      },
    },
  },
  "tanstack-start-react": {
    swOutput: ".output/public",
    navMode: "ssr",
    defaultStrategy: "network-first",
    precacheDirs: {
      ".output/public": {
        prefix: "/",
        stripExtensions: [".html"],
        stripSuffixes: ["index"],
      },
    },
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
  "nextjs",
  "remix",
  "tanstack-start-react",
  "astro",
  "nuxt",
  "quasar",
  "vitepress",
  "sveltekit",
  "vike",
  "react",
  "vue",
  "svelte",
  "qwik",
  "preact",
  "angular",
  "solid",
  "lit",
  "alpine",
  "marko",
  "stimulus",
  "jquery",
  "htmx",
  "vanilla",
  "no-bundler",
] as const;

export async function initCommand(
  projectRoot: string,
  yesMode?: boolean,
  frameworkOverride?: string,
) {
  const configFiles = ["swoff.config.json", "swoff.config.js"];
  const existingConfig = configFiles.find((f) =>
    existsSync(join(projectRoot, f)),
  );

  if (existingConfig) {
    log.warn(`Found existing ${existingConfig}. Aborting.`);
    log.info("Delete it first or run in a different directory.");
    return;
  }

  const detected =
    frameworkOverride && ALL_FRAMEWORKS.includes(frameworkOverride as never)
      ? (frameworkOverride as (typeof ALL_FRAMEWORKS)[number])
      : detectFramework(projectRoot);
  if (frameworkOverride && detected === frameworkOverride) {
    log.info(`Framework: ${detected} (override)`);
  }
  const preset = FRAMEWORK_PRESETS[detected] || {};

  if (yesMode) {
    const cachingPrescribed = !!(preset.patterns || preset.precacheDirs);
    const answers: WizardAnswers = {
      framework: detected,
      swOutput: (preset.swOutput as string) || "dist",
      autoActivate: false,
      navMode: (preset.navMode as "spa" | "ssr" | "default") || "default",
      fallback: "/offline",
      defaultStrategy: (preset.defaultStrategy as string) || "cache-first",
      patterns: preset.patterns as Record<string, string> | undefined,
      ignoreQueryParams: preset.ignoreQueryParams as string[] | undefined,
      pwaEnabled: false,
      authEnabled: false,
      connectivityEnabled: false,
      cachingEnabled: cachingPrescribed,
      mutationEnabled: false,
      backgroundSync: false,
      tagInvalidationEnabled: false,
      graphqlEnabled: false,
      serverPushEnabled: false,
      pushNotificationsEnabled: false,
      precacheDirs: preset.precacheDirs as
        | Record<string, PrecacheDirConfig>
        | undefined,
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

  const autoActivate = await confirm({
    message: "Auto-register the service worker?",
    initialValue: false,
  });
  if (isCancel(autoActivate)) process.exit(0);

  const pwaEnabled = await confirm({
    message: "Enable PWA install prompt?",
    initialValue: false,
  });
  if (isCancel(pwaEnabled)) process.exit(0);

  const connectivityEnabled = await confirm({
    message: "Enable connectivity (online/offline detection)?",
    initialValue: false,
  });
  if (isCancel(connectivityEnabled)) process.exit(0);

  let authType: string | undefined;
  const authEnabled = await confirm({
    message: "Enable authentication?",
    initialValue: false,
  });
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

  const cachingEnabled = await confirm({
    message: "Enable caching (fetch listener + offline cache)?",
    initialValue:
      !!(activePreset.patterns || activePreset.precacheDirs),
  });
  if (isCancel(cachingEnabled)) process.exit(0);

  let navMode: "spa" | "ssr" | "default" = "default";
  let fallback = "/offline";
  let defaultStrategy = "cache-first";
  let mutationEnabled = false;
  let backgroundSync: boolean | undefined;
  let tagInvalidationEnabled = false;
  let graphqlEnabled = false;
  let serverPushEnabled = false;
  let precacheDirs: Record<string, PrecacheDirConfig> | undefined;

  if (cachingEnabled) {
    navMode = (await select({
      message: "Navigation mode",
      options: [
        { value: "spa", label: "SPA" },
        { value: "ssr", label: "SSR" },
        { value: "default", label: "Default" },
      ],
      initialValue: (activePreset.navMode as string) || "default",
    })) as "spa" | "ssr" | "default";
    if (isCancel(navMode)) process.exit(0);

    fallback = (await text({
      message: "Offline fallback path",
      initialValue: "/offline",
    })) as string;
    if (isCancel(fallback)) process.exit(0);

    defaultStrategy = (await select({
      message: "Default caching strategy",
      options: [...STRATEGIES],
      initialValue: (activePreset.defaultStrategy as string) || "cache-first",
    })) as string;
    if (isCancel(defaultStrategy)) process.exit(0);

    mutationEnabled = (await confirm({
      message: "Enable mutation queue (offline mutations)?",
      initialValue: false,
    })) as boolean;
    if (isCancel(mutationEnabled)) process.exit(0);

    if (mutationEnabled) {
      backgroundSync = (await confirm({
        message: "Enable background sync for queued mutations?",
        initialValue: false,
      })) as boolean;
      if (isCancel(backgroundSync)) process.exit(0);
    }

    graphqlEnabled = (await confirm({
      message: "Enable GraphQL support?",
      initialValue: false,
    })) as boolean;
    if (isCancel(graphqlEnabled)) process.exit(0);

    tagInvalidationEnabled = (await confirm({
      message: "Enable tag invalidation?",
      initialValue: false,
    })) as boolean;
    if (isCancel(tagInvalidationEnabled)) process.exit(0);

    if (tagInvalidationEnabled) {
      serverPushEnabled = (await confirm({
        message: "Enable server push (requires tag invalidation)?",
        initialValue: false,
      })) as boolean;
      if (isCancel(serverPushEnabled)) process.exit(0);
    }

    const precacheDir = (await text({
      message: "Directory to precache (leave empty to skip)",
      initialValue: (activePreset.swOutput as string) || "dist",
    })) as string;
    if (isCancel(precacheDir)) process.exit(0);

    if (precacheDir) {
      let precachePrefix = "/";
      precachePrefix = (await text({
        message: "Precache URL prefix",
        initialValue: "/",
      })) as string;
      if (isCancel(precachePrefix)) process.exit(0);

      const presetEntry = (
        activePreset.precacheDirs as
          | Record<string, PrecacheDirConfig>
          | undefined
      )?.[precacheDir];
      precacheDirs = {
        [precacheDir]: {
          prefix: precachePrefix || "/",
          ...(presetEntry ?? {}),
        },
      };
    }
  }

  const pushNotificationsEnabled = await confirm({
    message: "Enable push notifications?",
    initialValue: false,
  });
  if (isCancel(pushNotificationsEnabled)) process.exit(0);

  log.info("");
  log.info("─".repeat(40));
  log.info("Summary");
  log.info(`  Framework:    ${framework}`);
  log.info(`  SW output:    ${swOutput}/swoff.sw.js`);
  if (autoActivate) log.info("  SW:           auto-activate");
  if (pwaEnabled) log.info("  PWA:          enabled");
  if (connectivityEnabled) log.info("  Connectivity: enabled");
  if (authEnabled) log.info(`  Auth:         ${authType}`);
  if (cachingEnabled) {
    log.info(`  Caching:      enabled (${defaultStrategy}, ${navMode})`);
    log.info(`  Fallback:     ${fallback}`);
    if (mutationEnabled) log.info("  Mutation Q:   enabled");
    if (tagInvalidationEnabled) log.info("  Tag Inval:    enabled");
    if (graphqlEnabled) log.info("  GraphQL:      enabled");
    if (serverPushEnabled) log.info("  Server Push:  enabled");
    if (precacheDirs)
      for (const [dir, entry] of Object.entries(precacheDirs))
        log.info(`  Precache:     ${dir} → ${entry.prefix}`);
  } else {
    log.info("  Caching:      disabled");
  }
  if (pushNotificationsEnabled) log.info("  Push Notif:   enabled");
  log.info("─".repeat(40));
  log.info("");

  const write = await confirm({
    message: "Write swoff.config.json?",
    initialValue: true,
  });
  if (isCancel(write) || !write) {
    outro("Aborted.");
    return;
  }

  const answers: WizardAnswers = {
    framework: framework as string,
    swOutput: swOutput as string,
    autoActivate: autoActivate as boolean,
    navMode,
    fallback,
    defaultStrategy,
    patterns: activePreset.patterns as Record<string, string> | undefined,
    ignoreQueryParams: activePreset.ignoreQueryParams as string[] | undefined,
    pwaEnabled: pwaEnabled as boolean,
    authEnabled: authEnabled as boolean,
    authType,
    connectivityEnabled: connectivityEnabled as boolean,
    cachingEnabled: cachingEnabled as boolean,
    mutationEnabled,
    backgroundSync,
    tagInvalidationEnabled,
    graphqlEnabled,
    serverPushEnabled,
    pushNotificationsEnabled: pushNotificationsEnabled as boolean,
    precacheDirs,
  };

  writeConfig(projectRoot, answers);
}

function writeConfig(projectRoot: string, answers: WizardAnswers) {
  const config = buildMinimalConfig(answers);
  const configPath = join(projectRoot, "swoff.config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  outro(
    `Config written to swoff.config.json (${Object.keys(config).length} top-level keys)`,
  );
}
