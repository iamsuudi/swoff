import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import {
  rewriteAdapterSource,
  generateFrameworkAdapters,
} from "../lib/generators/file-generators/generate-framework-adapters.js";
import type { GeneratorContext } from "../lib/generators/file-generators/context.js";
import { defaultConfig, deepMerge } from "../lib/shared/config-types.js";

const testDir = "/tmp/swoff-test-adapters";

function makeContext(frameworkName: string, ext: "ts" | "js"): GeneratorContext {
  const config = deepMerge(defaultConfig, {
    features: {
      tagInvalidation: { enabled: true },
      mutationQueue: { enabled: true, backgroundSync: false },
      auth: { enabled: true, type: "cookie" },
      pushNotifications: true,
      connectivity: { enabled: true },
    },
  });
  return {
    config,
    projectRoot: testDir,
    swoffDir: join(testDir, "swoff"),
    ext,
    generatedFiles: [],
    frameworkName,
    hasBundler: true,
  };
}

describe("rewriteAdapterSource", () => {
  it("normalizes extensionless specifiers for ts projects", () => {
    const src = `import { getStorageEstimate } from "../storage";
import { resetSwoff } from "../reset";`;
    expect(rewriteAdapterSource(src, "ts")).toBe(
      `import { getStorageEstimate } from "../storage.ts";
import { resetSwoff } from "../reset.ts";`,
    );
  });

  it("normalizes extensionless specifiers for js projects", () => {
    const src = `import { getStorageEstimate } from "../storage";
import { retrySync } from "../mutation/sync";`;
    expect(rewriteAdapterSource(src, "js")).toBe(
      `import { getStorageEstimate } from "../storage.js";
import { retrySync } from "../mutation/sync.js";`,
    );
  });

  it("keeps explicit extensions in sync with the project language", () => {
    expect(rewriteAdapterSource('from "../auth/state.ts"', "ts")).toBe('from "../auth/state.ts"');
    expect(rewriteAdapterSource('from "../auth/state.js"', "js")).toBe('from "../auth/state.js"');
    // a .ts specifier in a js project is rewritten to .js
    expect(rewriteAdapterSource('from "../auth/store.js"', "ts")).toBe('from "../auth/store.ts"');
  });

  it("fixes the stale realtime/notifications path to push-notification/index", () => {
    const src = `import {
  subscribeToPush,
  unsubscribeFromPush,
} from "../realtime/notifications.ts";`;
    expect(rewriteAdapterSource(src, "ts")).toContain('from "../push-notification/index.ts"');
    const jsSrc = `import { isSubscribed } from "../realtime/notifications.js";`;
    expect(rewriteAdapterSource(jsSrc, "js")).toContain('from "../push-notification/index.js"');
  });

  it("keeps the swoff.d.ts type reference intact", () => {
    const src = `import type { MutationQueueItem } from "../swoff.d.ts";`;
    expect(rewriteAdapterSource(src, "ts")).toBe(
      `import type { MutationQueueItem } from "../swoff.d.ts";`,
    );
  });

  it("leaves non-swoff specifiers untouched", () => {
    const src = `import { useState } from "react";
import { fetchWrapper } from "../components/wrapper.js";`;
    expect(rewriteAdapterSource(src, "ts")).toBe(src);
  });
});

describe("generateFrameworkAdapters", () => {
  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  });

  it("emits react-family adapters as .tsx with project-correct imports", () => {
    const ctx = makeContext("nextjs", "ts");
    generateFrameworkAdapters(ctx);

    const fetchPath = join(ctx.swoffDir, "adapters", "useSwoffFetch.tsx");
    expect(existsSync(fetchPath)).toBe(true);
    const fetchSrc = readFileSync(fetchPath, "utf8");
    expect(fetchSrc).toContain('from "../fetch/core.ts"');

    const pushPath = join(ctx.swoffDir, "adapters", "useSwoffPush.tsx");
    expect(existsSync(pushPath)).toBe(true);
    expect(readFileSync(pushPath, "utf8")).toContain('from "../push-notification/index.ts"');

    const authPath = join(ctx.swoffDir, "adapters", "useSwoffAuth.tsx");
    expect(existsSync(authPath)).toBe(true);
    expect(readFileSync(authPath, "utf8")).toContain('from "../auth/state.ts"');
    expect(readFileSync(authPath, "utf8")).toContain('from "../auth/store.ts"');

    // tracks files relative to the sweez config path
    expect(ctx.generatedFiles).toContain("swoff/adapters/useSwoffFetch.tsx");
  });

  it("emits js projects as .jsx with .js imports", () => {
    const ctx = makeContext("react", "js");
    generateFrameworkAdapters(ctx);

    const fetchPath = join(ctx.swoffDir, "adapters", "useSwoffFetch.jsx");
    expect(existsSync(fetchPath)).toBe(true);
    expect(readFileSync(fetchPath, "utf8")).toContain('from "../fetch/core.js"');

    const pushPath = join(ctx.swoffDir, "adapters", "useSwoffPush.jsx");
    expect(existsSync(pushPath)).toBe(true);
    expect(readFileSync(pushPath, "utf8")).toContain('from "../push-notification/index.js"');
  });

  it("emits vue-family adapters as .ts with .ts imports", () => {
    const ctx = makeContext("nuxt", "ts");
    generateFrameworkAdapters(ctx);

    const fetchPath = join(ctx.swoffDir, "adapters", "useSwoffFetch.ts");
    expect(existsSync(fetchPath)).toBe(true);
    expect(readFileSync(fetchPath, "utf8")).toContain('from "../fetch/core.ts"');
    // never a JSX extension for vue
    expect(existsSync(join(ctx.swoffDir, "adapters", "useSwoffFetch.tsx"))).toBe(false);
  });

  it("skips adapters whose feature is disabled", () => {
    const ctx = makeContext("react", "ts");
    ctx.config.features.backgroundSync = false;
    ctx.config.features.mutationQueue.backgroundSync = false;
    generateFrameworkAdapters(ctx);
    expect(existsSync(join(ctx.swoffDir, "adapters", "useSwoffSync.tsx"))).toBe(false);
  });
});