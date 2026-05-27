# Swoff — Quick Reference

For the full guide with explanations, read **[GUIDE.md](./GUIDE.md)**.

## Entry point
```ts
import { initServiceWorker } from "./swoff/client-injector.ts";
initServiceWorker();
```

## API calls (use for all fetch requests)
Use `fetchWithCache` instead of `fetch()` — it sets caching headers the SW needs.
Plain `fetch()` skips SW caching when `cacheStrategy` is `"explicit-only"`.
```ts
import { fetchWithCache } from "./swoff/fetch-wrapper.ts";
const data = await fetchWithCache("/api/data").then(r => r.json());
```

## Authenticated API calls
```ts
import { fetchWithCache } from "./swoff/fetch-wrapper.ts";
const data = await fetchWithCache("/api/me", { auth: true }).then(r => r.json());
```

## Offline mutations (queue writes when offline)
```ts
import { queueMutation, getPendingCount } from "./swoff/mutation-queue.ts";
await queueMutation({ method: "POST", url: "/api/todos", body: {...} });
```

## After re-login (flush queued mutations)
```ts
import { flushMutations } from "./swoff/mutation-queue.ts";
await flushMutations();
```

## GraphQL (cached queries with body-hash)
```ts
import { queryGql, mutateGql } from "./swoff/gql-wrapper.ts";
const { data } = await queryGql("{ todos { id title } }");
const { data: created } = await mutateGql(
  "mutation CreateTodo($t: String!) { createTodo(title: $t) { id } }",
  { t: "New task" },
);
```

## Push notifications
```ts
import { subscribeToPush, unsubscribeFromPush, isSubscribed } from "./swoff/push.ts";
const sub = await subscribeToPush("YOUR_VAPID_PUBLIC_KEY");
```

## React hooks
```tsx
import { useCachedFetch } from "./swoff/hooks/useCachedFetch.tsx";
import { useMutation } from "./swoff/hooks/useMutation.tsx";
import { usePrefetch } from "./swoff/hooks/usePrefetch.tsx";

const { data, error, loading, refetch } = useCachedFetch("/api/todos", {
  refetchOnWindowFocus: true,
});

const { mutate } = useMutation({ onSuccess: (data) => console.log(data) });
mutate("/api/todos", { method: "POST", body: JSON.stringify({ title: "New" }) });

const prefetch = usePrefetch();
prefetch("/api/todos");
```

## Cache invalidation
```ts
import { generateTags, invalidateUrl } from "./swoff/invalidation-tags.ts";
const data = await fetchWithCache("/api/todos", { tags: generateTags("/api/todos") });
await invalidateUrl("/api/todos/42"); // after mutation
```

## Build script
The SW generator learns your build output to precache assets.
Swoff has already added this to your `package.json`:
```json
"build": "<your-build> && node swoff/sw/generator.js"
```