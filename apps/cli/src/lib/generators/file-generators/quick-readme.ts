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
  w("Use `fetchWithCache` instead of `fetch()` — it sets caching headers the SW needs.");
  w("Plain `fetch()` skips SW caching when `cacheStrategy` is `\"explicit-only\"`.");
  w("```ts");
  w(`import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
  w('const data = await fetchWithCache("/api/data").then(r => r.json());');
  w("```");
  w("");

  if (config.features.auth.enabled) {
    w("## Authenticated API calls");
    w("```ts");
    w(`import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
    w('const data = await fetchWithCache("/api/me", { auth: true }).then(r => r.json());');
    w("```");
    w("");
  }

  if (config.features.mutationQueue.enabled) {
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

  if (config.features.graphql.enabled) {
    w("## GraphQL (cached queries with body-hash)");
    w("```ts");
    w(`import { queryGql, mutateGql } from "./swoff/gql-wrapper.${ext}";`);
    w('const { data } = await queryGql("{ todos { id title } }");');
    w('const { data: created } = await mutateGql(');
    w('  "mutation CreateTodo($t: String!) { createTodo(title: $t) { id } }",');
    w('  { t: "New task" },');
    w(");");
    w("```");
    w("");
  }

  if (config.features.pushNotifications?.enabled) {
    w("## Push notifications");
    w("```ts");
    w(`import { subscribeToPush, unsubscribeFromPush, isSubscribed } from "./swoff/push.${ext}";`);
    w('const sub = await subscribeToPush("YOUR_VAPID_PUBLIC_KEY");');
    w("```");
    w("");
  }

  if (ctx.frameworkName === "react") {
    w("## React hooks");
    w("```tsx");
    w(`import { useCachedFetch } from "./swoff/hooks/useCachedFetch.${ext}x";`);
    w(`import { useMutation } from "./swoff/hooks/useMutation.${ext}x";`);
    w(`import { usePrefetch } from "./swoff/hooks/usePrefetch.${ext}x";`);
    w("");
    w('const { data, error, loading, refetch } = useCachedFetch("/api/todos", {');
    w('  refetchOnWindowFocus: true,');
    w('});');
    w("");
    w('const { mutate } = useMutation({ onSuccess: (data) => console.log(data) });');
    w('mutate("/api/todos", { method: "POST", body: JSON.stringify({ title: "New" }) });');
    w("");
    w('const prefetch = usePrefetch();');
    w('prefetch("/api/todos");');
    w("```");
    w("");
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

  w("## Build script");
  w("The SW generator learns your build output to precache assets.");
  w("Swoff has already added this to your `package.json`:");
  w("```json");
  w('"build": "<your-build> && node swoff/sw/generator.js"');
  w("```");

  writeFile(ctx, "README.md", lines.join("\n"));
}
