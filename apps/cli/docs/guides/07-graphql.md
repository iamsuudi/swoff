# GraphQL (replaces Apollo Client)

> **If you're coming from Apollo Client:** Swoff caches GraphQL responses by body hash (query + variables → SHA-256 digest), not by normalized entities. No schema introspection, no fragment matchers, no `InMemoryCache` config. Each query is a standalone cache entry. Mutations auto-invalidate by operation name tags. See the [full comparison](../comparisons/graphql.md).

## Preconditions

- Swoff initialized with data fetching enabled
- A GraphQL endpoint (default: `/graphql`)

## Enable

```bash
npx @swoff/cli add graphql
```

Or set `features.graphql.enabled: true` and `features.graphql.endpoints` in `swoff.config.json` then regenerate.

## Generated files

| File                     | What it does                                  | Import in your code? |
| ------------------------ | --------------------------------------------- | -------------------- |
| `swoff/graphql/index.ts` | `fetchWithGql()`, `queryGql()`, `mutateGql()` | Yes                  |

## Usage

```ts
import { queryGql, mutateGql } from "./swoff/graphql";

// Query — cached by body hash (query + variables)
// Auto-tagged by operation name: "GetNotes"
const { data, fromCache } = await queryGql(`
  query GetNotes {
    notes { id title }
  }
`);

// Query with variables
const { data: todo } = await queryGql(
  `
  query GetTodo($id: ID!) {
    todo(id: $id) { id title }
  }
`,
  { id: "42" },
);

// Authenticated query
const { data } = await queryGql(
  `
  query Me { me { name } }
`,
  {},
  { auth: true },
);

// Mutation — auto-invalidates related tags by operation name
const { data: created } = await mutateGql(
  `
  mutation CreateNote($title: String!) {
    createNote(title: $title) { id }
  }
`,
  { title: "New note" },
);
// Auto-invalidates: ["notes", "note"] (derived from "CreateNote")

// Offline: mutations are auto-queued
const { data } = await mutateGql(
  `
  mutation CreateNote($title: String!) {
    createNote(title: $title) { id }
  }
`,
  { title: "Offline task" },
  { queueOffline: true },
);

// Custom tags override operation-name auto-tags
const { data } = await queryGql(
  `query GetNotes { notes { id } }`,
  {},
  {
    tags: ["custom-tag"],
  },
);
```

## React adapters

You can use `useCachedFetch` with GraphQL endpoints — the SW caches by body hash when the request has a `query` field:

```tsx
import { useCachedFetch } from "./swoff/adapters/useCachedFetch";

function Notes() {
  const { data } = useCachedFetch("/graphql", {
    method: "POST",
    body: JSON.stringify({
      query: `query GetNotes { notes { id title } }`,
    }),
    strategy: "stale-while-revalidate",
    staleTime: 30,
  });

  return <div>{data?.notes.map(n => <p key={n.id}>{n.title}</p>)}</div>;
}
```

For a dedicated GraphQL API with operation-name auto-tags, use the generated `queryGql`/`mutateGql` functions instead.

### Multiple endpoints

```ts
import { queryGql } from "./swoff/graphql";

// Pass endpointIndex to choose which endpoint
const { data } = await queryGql(`query { ... }`, {}, {}, 1);
// Uses GQL_ENDPOINTS[1]
```

## Customize

No generated files to edit. The wrapper lives at `swoff/graphql/index.ts` and is regenerated on each `swoff generate` — manual edits would be overwritten.

## Config

```json
{
  "features": {
    "graphql": {
      "enabled": true,
      "endpoints": ["/graphql"]
    }
  }
}
```

- `endpoints` — array of GraphQL endpoint paths. Index 0 is the default. Use `endpointIndex` in `queryGql`/`mutateGql` to select others.

## Related

- [Full comparison: Swoff vs Apollo Client](../comparisons/graphql.md)
- [Tag invalidation: auto-tags from operation names](./06-tag-invalidation.md)
- [Offline mutations: queue mutations offline](./08-offline-mutations.md)
- [Config reference: graphql](../CONFIG.md#featuresgraphql)
