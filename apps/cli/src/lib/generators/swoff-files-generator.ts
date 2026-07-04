import { join } from "path";
import { fileURLToPath } from "url";
import { loadConfigAsync } from "../config/loader.js";
import type { GeneratorContext } from "./file-generators/context.js";
import type { SwoffConfig } from "../shared/config-types.js";
import { generateApiConfig } from "./file-generators/api-config.js";
import { generateSwTemplate } from "./file-generators/sw-template.js";
import { generateSwInjector } from "./file-generators/sw-injector.js";
import { generateClientInjector } from "./file-generators/client-injector.js";
import { generateClientInjectorBundle } from "./file-generators/client-injector-bundle.js";
import { generateFetchWrapper } from "./file-generators/fetch-wrapper.js";
import { generateCache } from "./file-generators/cache.js";
import { generateMutationQueue } from "./file-generators/mutation-queue.js";
import { shouldIncludeBackgroundSync, shouldIncludeServerPush } from "./sw-sections/shared.js";
import { generateBackgroundSync } from "./file-generators/background-sync.js";
import { generatePwaInstall } from "./file-generators/pwa-install.js";
import { generateInvalidationTags } from "./file-generators/invalidation-tags.js";
import { generatePush } from "./file-generators/push.js";
import { generateMutationState } from "./file-generators/mutation-state.js";
import { generateServerPush } from "./file-generators/server-push.js";
import { generateAuthStore } from "./file-generators/auth-store.js";
import { generateAuthAdapter } from "./file-generators/auth-adapter.js";
import { generateAuthState } from "./file-generators/auth-state.js";
import { generateSwGeneratorBuild } from "./file-generators/sw-generator-build.js";
import { generateGqlWrapper } from "./file-generators/gql-wrapper.js";
import { generateTypeDefinitions } from "./file-generators/type-definitions.js";
import { generateFrameworkAdapters } from "./file-generators/generate-framework-adapters.js";
import { generateSwoffApiBundle } from "./file-generators/swoff-api-bundle.js";
import { generateReset } from "./file-generators/reset.js";
import { generateOpenDB } from "./file-generators/open-db.js";
import { generateStorage } from "./file-generators/storage.js";
import { generateConnectivity } from "./file-generators/connectivity.js";
import { generateAuthCheck } from "./file-generators/auth-check.js";
import { hasBundler } from "./file-generators/context.js";

interface Step {
  name: string;
  gen: () => void;
  enabled: boolean;
}

interface ResolvedFeatures {
  connectivity: boolean;
  tagInvalidation: boolean;
  auth: boolean;
  mutationQueue: boolean;
  backgroundSync: boolean;
  push: boolean;
  graphql: boolean;
  pwa: boolean;
  serverPush: boolean;
  needDb: boolean;
}

function resolveFeatures(config: SwoffConfig): ResolvedFeatures {
  const auth = config.features.auth.enabled;
  const mutationQueue = config.features.mutationQueue.enabled;
  const tagInvalidation = config.features.tagInvalidation.enabled || mutationQueue || config.features.graphql.enabled;
  const connectivity = config.features.connectivity.enabled || auth;
  const push = config.features.pushNotifications;
  const graphql = config.features.graphql.enabled;
  const pwa = config.features.pwa.enabled;
  const serverPush = shouldIncludeServerPush(config);
  const backgroundSync = shouldIncludeBackgroundSync(config);

  return {
    connectivity,
    tagInvalidation,
    auth,
    mutationQueue,
    backgroundSync,
    push,
    graphql,
    pwa,
    serverPush,
    needDb: auth || mutationQueue || push,
  };
}

export function generateFiles(ctx: GeneratorContext): string[] {
  const bundler = ctx.hasBundler;
  const f = resolveFeatures(ctx.config);

  if (!bundler) {
    ctx.hasBundler = false;
    const hasApiFeatures = f.tagInvalidation || f.auth || f.mutationQueue || f.graphql || f.push;
    const bundleSteps: Step[] = [
      { name: "sw-template", gen: () => generateSwTemplate(ctx), enabled: true },
      { name: "sw-generator", gen: () => generateSwGeneratorBuild(ctx), enabled: true },
      {
        name: "client-injector-bundle",
        gen: () => generateClientInjectorBundle(ctx),
        enabled: true,
      },
      {
        name: "swoff-api-bundle",
        gen: () => generateSwoffApiBundle(ctx),
        enabled: hasApiFeatures,
      },
    ];
    for (const step of bundleSteps) {
      if (!step.enabled) continue;
      step.gen();
    }
    return ctx.generatedFiles;
  }

  const steps: Step[] = [
    { name: "api-config", gen: () => generateApiConfig(ctx), enabled: f.serverPush },
    { name: "sw-template", gen: () => generateSwTemplate(ctx), enabled: true },
    { name: "sw-injector", gen: () => generateSwInjector(ctx), enabled: true },
    {
      name: "client-injector",
      gen: () => generateClientInjector(ctx),
      enabled: true,
    },
    {
      name: "connectivity",
      gen: () => generateConnectivity(ctx),
      enabled: f.connectivity,
    },
    { name: "storage", gen: () => generateStorage(ctx), enabled: true },
    { name: "reset", gen: () => generateReset(ctx), enabled: true },
    { name: "db", gen: () => generateOpenDB(ctx), enabled: f.needDb },
    {
      name: "fetch/core",
      gen: () => generateFetchWrapper(ctx),
      enabled: f.tagInvalidation,
    },
    {
      name: "cache/tags",
      gen: () => generateInvalidationTags(ctx),
      enabled: f.tagInvalidation,
    },
    {
      name: "cache/invalidate",
      gen: () => generateCache(ctx),
      enabled: f.tagInvalidation,
    },
    {
      name: "mutation/queue",
      gen: () => generateMutationQueue(ctx),
      enabled: f.mutationQueue,
    },
    {
      name: "mutation/state",
      gen: () => generateMutationState(ctx),
      enabled: f.mutationQueue,
    },
    {
      name: "mutation/sync",
      gen: () => generateBackgroundSync(ctx),
      enabled: f.backgroundSync,
    },
    {
      name: "auth/adapter",
      gen: () => generateAuthAdapter(ctx),
      enabled: f.auth,
    },
    {
      name: "auth-store",
      gen: () => generateAuthStore(ctx),
      enabled: f.auth,
    },
    {
      name: "auth-state",
      gen: () => generateAuthState(ctx),
      enabled: f.auth,
    },
    {
      name: "auth/check",
      gen: () => generateAuthCheck(ctx),
      enabled: f.auth,
    },
    {
      name: "sw-generator",
      gen: () => generateSwGeneratorBuild(ctx),
      enabled: true,
    },
    {
      name: "swoff.d.ts",
      gen: () => generateTypeDefinitions(ctx),
      enabled: ctx.ext === "ts",
    },
    {
      name: "pwa/prompt",
      gen: () => generatePwaInstall(ctx),
      enabled: f.pwa,
    },
    {
      name: "graphql/index",
      gen: () => generateGqlWrapper(ctx),
      enabled: f.graphql,
    },
    {
      name: "push-notification/index",
      gen: () => generatePush(ctx),
      enabled: f.push,
    },
    {
      name: "server-push/client",
      gen: () => generateServerPush(ctx),
      enabled: f.serverPush,
    },
    {
      name: "framework-adapters",
      gen: () => generateFrameworkAdapters(ctx),
      enabled: [
        "react",
        "nextjs",
        "remix",
        "tanstack-start-react",
        "astro",
        "vike",
      ].includes(ctx.frameworkName),
    },
  ];

  for (const step of steps) {
    if (!step.enabled) continue;
    step.gen();
  }

  return ctx.generatedFiles;
}

// --- CLI entry point ---
if (
  fileURLToPath(import.meta.url) ===
  fileURLToPath(new URL(process.argv[1], "file:"))
) {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | null => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const projectRoot = getArg("project-root") || process.cwd();
  const language = getArg("language") || "ts";
  const configPath =
    getArg("config-path") || join(projectRoot, "swoff.config.json");
  const debug = getArg("debug") === "true";

  loadConfigAsync(projectRoot, configPath)
    .then(({ config }) => {
      const ext = language === "ts" ? "ts" : "js";
      const swoffDir = join(projectRoot, config.build?.swoffPath || "swoff");
      const generatedFiles: string[] = [];

      const fwName = config.framework ?? "no-bundler";
      const ctx: GeneratorContext = {
        config,
        projectRoot,
        swoffDir,
        ext,
        generatedFiles,
        frameworkName: fwName,
        hasBundler: hasBundler(fwName),
        debug,
      };

      console.log(`Generating Swoff files (${language})...`);

      generateFiles(ctx);

      console.log("Generated files:");
      generatedFiles.forEach((file) => console.log(`  ${file}`));
      console.log(`\nTotal: ${generatedFiles.length} files`);

      if (config.features.auth.enabled) {
        const authType = config.features.auth.type;
        console.log(`\n--- Auth Setup ---`);
        console.log(`  Auth adapter: ${authType}`);
        console.log(`  1. Edit swoff/auth/adapter.ts to match your backend:`);
        if (authType === "cookie" || authType === "bearer" || authType === "custom") {
          console.log(`     - getHeaders(): return auth headers for fetch requests`);
          console.log(`     - refresh(): implement token/session refresh`);
          console.log(`     - fetchUser(): implement fetching current user`);
        } else {
          console.log(`     - Review the import path and defaults for your auth provider.`);
        }
        console.log(
          `  2. Use { auth: true } in fetchWithCache for authenticated requests`,
        );
        console.log(
          `  3. Use setAuth()/clearAuth() from auth/store.ts in login/logout handlers`,
        );
      }
    })
    .catch((err) => {
      console.error(
        "Failed to load config:",
        err instanceof Error ? err.message : String(err),
      );
      process.exit(1);
    });
}
