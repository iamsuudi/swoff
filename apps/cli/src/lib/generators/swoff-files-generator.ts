/**
 * Swoff Files Generator
 *
 * Generates framework-agnostic pattern files based on swoff.config.json features.
 * Thin orchestrator - delegates to file-generators for each template.
 *
 * CLI Usage:
 *   node swoff-files-generator.js --project-root <path> --language <ts|js> --config-path <path>
 *
 * Module Usage:
 *   import { generateFiles } from './swoff-files-generator.js';
 *   const files = generateFiles(ctx);
 */

import { join } from "path";
import { fileURLToPath } from "url";
import { loadConfigAsync } from "../config/loader.js";
import type { GeneratorContext } from "./file-generators/context.js";
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
import { generateGuide } from "./file-generators/guide-generator.js";
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

export function generateFiles(ctx: GeneratorContext): string[] {
  const bundler = ctx.hasBundler;

  // When !hasBundler: generate the universal bundle instead of individual modular files.
  // The bundle inlines SW registration, connectivity, storage, event listeners,
  // and auto-initializes. Feature modules (mutation, auth, etc.) are only
  // available to bundler users who can import individual files.
  if (!bundler) {
    ctx.hasBundler = false;
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
        enabled: true,
      },
      { name: "GUIDE.md", gen: () => generateGuide(ctx), enabled: true },
    ];
    for (const step of bundleSteps) {
      if (!step.enabled) continue;
      step.gen();
    }
    return ctx.generatedFiles;
  }

  const steps: Step[] = [
    { name: "api-config", gen: () => generateApiConfig(ctx), enabled: true },
    { name: "sw-template", gen: () => generateSwTemplate(ctx), enabled: true },
    { name: "sw-injector", gen: () => generateSwInjector(ctx), enabled: true },
    {
      name: "connectivity",
      gen: () => generateConnectivity(ctx),
      enabled: true,
    },
    {
      name: "client-injector",
      gen: () => generateClientInjector(ctx),
      enabled: true,
    },
    { name: "fetch/core", gen: () => generateFetchWrapper(ctx), enabled: true },
    { name: "cache/invalidate", gen: () => generateCache(ctx), enabled: true },
    { name: "reset", gen: () => generateReset(ctx), enabled: true },
    { name: "db", gen: () => generateOpenDB(ctx), enabled: true },
    {
      name: "mutation/queue",
      gen: () => generateMutationQueue(ctx),
      enabled: ctx.config.features.mutationQueue.enabled,
    },
    {
      name: "mutation/state",
      gen: () => generateMutationState(ctx),
      enabled: ctx.config.features.mutationQueue.enabled,
    },
    {
      name: "mutation/sync",
      gen: () => generateBackgroundSync(ctx),
      enabled: shouldIncludeBackgroundSync(ctx.config),
    },
    {
      name: "auth/adapter",
      gen: () => generateAuthAdapter(ctx),
      enabled: ctx.config.features.auth.enabled,
    },
    {
      name: "auth-store",
      gen: () => generateAuthStore(ctx),
      enabled: ctx.config.features.auth.enabled,
    },
    {
      name: "auth-state",
      gen: () => generateAuthState(ctx),
      enabled: ctx.config.features.auth.enabled,
    },
    {
      name: "auth/check",
      gen: () => generateAuthCheck(ctx),
      enabled: ctx.config.features.auth.enabled,
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
      enabled: ctx.config.features.pwa.enabled,
    },
    {
      name: "cache/tags",
      gen: () => generateInvalidationTags(ctx),
      enabled: true,
    },
    {
      name: "graphql/index",
      gen: () => generateGqlWrapper(ctx),
      enabled: ctx.config.features.graphql.enabled,
    },
    {
      name: "push-notification/index",
      gen: () => generatePush(ctx),
      enabled: ctx.config.features.pushNotifications,
    },
    {
      name: "server-push/client",
      gen: () => generateServerPush(ctx),
      enabled: shouldIncludeServerPush(ctx.config),
    },
    {
      name: "framework-adapters",
      gen: () => generateFrameworkAdapters(ctx),
      enabled: [
        "react-spa",
        "nextjs",
        "remix",
        "tanstack-start-react",
        "astro",
      ].includes(ctx.frameworkName),
    },
    {
      name: "storage",
      gen: () => generateStorage(ctx),
      enabled: true,
    },
    { name: "GUIDE.md", gen: () => generateGuide(ctx), enabled: true },
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
      const swoffDir = join(projectRoot, "swoff");
      const generatedFiles: string[] = [];

      const fwName = config.framework ?? "vanilla";
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
