/**
 * Generates README.md — quick reference for integrating enabled features.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateReadme(ctx: GeneratorContext): void {
  const { config } = ctx;
  const ext = ctx.ext;
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  w("# Swoff — Quick Reference");
  w("");
  w("For the full guide with explanations, read **[GUIDE.md](./GUIDE.md)**.");
  w("");

  const hasClientInjector = true;

  if (hasClientInjector) {
    w("## Entry point");
    w("```ts");
    w(`import { initServiceWorker } from "./swoff/client-injector.${ext}";`);
    w("initServiceWorker();");
    w("```");
    w("");
  }

  w("## API calls (use for all fetch requests)");
  w("```ts");
  w(`import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
  w('const data = await fetchWithCache("/api/data").then(r => r.json());');
  w("```");
  w("");

  if (config.features.auth.enabled) {
    w("## Authenticated API calls");
    w("```ts");
    w(`import { authenticatedFetch } from "./swoff/auth/fetch.${ext}";`);
    w('const data = await authenticatedFetch("/api/me").then(r => r.json());');
    w("```");
    w("");
  }

  if (config.features.mutationQueue) {
    w("## Offline mutations (queue writes when offline)");
    w("```ts");
    w(`import { queueMutation, getPendingCount } from "./swoff/mutation-queue.${ext}";`);
    w("await queueMutation({ method: \"POST\", url: \"/api/todos\", body: {...} });");
    w("```");
    w("");

    if (config.features.auth.enabled) {
      w("## After re-login (flush queued mutations)");
      w("```ts");
      w(`import { flushMutations } from "./swoff/mutation-queue.${ext}";`);
      w("await flushMutations();");
      w("```");
      w("");
    }
  }

  if (config.features.tagInvalidation) {
    w("## Cache invalidation");
    w("```ts");
    w(`import { generateTags, invalidateUrl } from "./swoff/invalidation-tags.${ext}";`);
    w('const data = await fetchWithCache("/api/todos", { tags: generateTags("/api/todos") });');
    w('await invalidateUrl("/api/todos/42"); // after mutation');
    w("```");
    w("");
  }

  if (ctx.frameworkName === "react") {
    w("## React hook — auto-refetch on cache invalidation");
    w("```tsx");
    w(`import { useCachedFetch } from "./swoff/hooks/useCachedFetch.${ext}x";`);
    w('const { data, error, loading, refetch } = useCachedFetch("/api/todos");');
    w("```");
    w("");
  }

  w("## Build script");
  w("The SW generator learns your build output to precache assets.");
  w("Swoff has already added this to your `package.json`:");
  w("```json");
  w('"build": "<your-build> && node swoff/sw/generator.js"');
  w("```");

  writeFile(ctx, "README.md", lines.join("\n"));
}
