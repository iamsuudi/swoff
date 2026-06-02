import type { RuntimeContext } from "./utils.js";
import { T, R, G, AS } from "./utils.js";

export function generateGqlWrapperCode(
  ctx: RuntimeContext,
  endpoint: string,
): string {
  const { ext, ts } = ctx;

  const optionsInterface = ts
    ? `
export interface GqlOptions {
  variables?: Record<string, unknown>;
  tags?: string[];
  auth?: boolean;
  queueOffline?: boolean;
  invalidate?: 'auto' | string[] | false;
}
`
    : "";

  return `/**
 * Swoff GraphQL Wrapper
 * Brings Swoff's caching, offline queue, and tag-based invalidation to GraphQL APIs.
 * Hashes query + variables for deterministic cache keys and auto-generates tags
 * from operation names. Built on top of fetchWithCache.
 *
 * Usage:
 *   import { fetchWithGql, queryGql, mutateGql } from './swoff/gql-wrapper.${ext}';
 *
 *   // Query — cached with body-hash key
 *   const { data } = await queryGql("{ todos { id title } }");
 *
 *   // Query with variables
 *   const { data: todo } = await queryGql(
 *     "query GetTodo($id: ID!) { todo(id: $id) { id title } }",
 *     { id: "42" }
 *   );
 *
 *   // Mutation — auto-invalidates related cache tags
 *   const { data: created } = await mutateGql(
 *     "mutation CreateTodo($title: String!) { createTodo(title: $title) { id } }",
 *     { title: "New task" }
 *   );
 *
 *   // Authenticated
 *   const { data } = await queryGql("query Me { me { name } }", {}, { auth: true });
 *
 *   // Offline: mutations are auto-queued
 *   const { data } = await mutateGql(
 *     "mutation CreateTodo($title: String!) { createTodo(title: $title) { id } }",
 *     { title: "Offline task" },
 *     { queueOffline: true }
 *   );
 */

import { fetchWithCache } from "./fetch-wrapper.${ext}";
import type { GqlResult } from "./swoff";
${optionsInterface}
/** Extract operation name from a GraphQL document. Returns null for anonymous queries (e.g. "{ todos { id } }"). */
function getOperationName(query${T(ts, "string")})${T(ts, "string | null")}{
  const match = query.match(/(query|mutation|subscription)\\s+(\\w+)/);
  return match ? match[2] : null;
}

/** Determine if a GraphQL document is a query (read) vs mutation/subscription (write). */
function isReadOperation(query${T(ts, "string")})${T(ts, "boolean")}{
  const trimmed = query.trim();
  if (trimmed.startsWith("mutation") || trimmed.startsWith("subscription")) return false;
  return true;
}

/** Hash an object into a hex string for deterministic cache keying. Uses SHA-256 via SubtleCrypto. */
async function bodyHash(obj${T(ts, "unknown")})${T(ts, "Promise<string>")}{
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Generate cache-relevant tags from a GQL operation name. e.g. "getTodos" → ["todos"], "createTodo" → ["todos", "todo"]. */
function tagsFromOpName(name${T(ts, "string | null")})${T(ts, "string[]")}{
  if (!name) return [];
  const stripped = name.replace(/^(get|fetch|list|all|query)/i, "").replace(/^(create|set|add|new|update|delete|remove)/i, "");
  if (!stripped) return [name.toLowerCase()];
  const tag = stripped.charAt(0).toLowerCase() + stripped.slice(1);
  const plural = tag.replace(/s$/, "") + "s";
  return [plural, tag];
}

/** Fetch a GraphQL endpoint with Swoff's caching, auth, offline queue, and auto-invalidation. Hashes query + variables for deterministic cache keys. */
export async function fetchWithGql${G(ts, "T")}(
  query${T(ts, "string")},
  options${T(ts, "GqlOptions")} = {}
)${R(ts, "Promise<GqlResult<T>>")}{
  const isRead = isReadOperation(query);
  const opName = getOperationName(query);
  const variables = options.variables;
  const hash = await bodyHash({ query, variables });
  const tags = options.tags || tagsFromOpName(opName);

  const { response, fromCache } = await fetchWithCache("${endpoint}", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
    headers: {
      "Content-Type": "application/json",
      "X-SW-Cache-Key": "gql:" + hash,
    },
    tags,
    type: isRead ? "read" : "mutation",
    auth: options.auth,
    queueOffline: options.queueOffline,
    invalidate: options.invalidate,
  });

  if (!response.ok) {
    throw new Error("GraphQL request failed with status " + response.status);
  }
  const result = await response.json();
  return { data: result.data${AS(ts, "T")}, fromCache };
}

/** Shorthand for GraphQL queries (type: "read"). Cached by default with body-hash key. */
export async function queryGql${G(ts, "T")}(
  query${T(ts, "string")},
  variables${T(ts, "Record<string, unknown> | undefined")} = undefined,
  options${T(ts, "GqlOptions")} = {}
)${R(ts, "Promise<GqlResult<T>>")}{
  return fetchWithGql${G(ts, "T")}(query, { ...options, variables });
}

/** Shorthand for GraphQL mutations (type: "mutation"). Auto-invalidates related cache tags. */
export async function mutateGql${G(ts, "T")}(
  mutation${T(ts, "string")},
  variables${T(ts, "Record<string, unknown> | undefined")} = undefined,
  options${T(ts, "GqlOptions")} = {}
)${R(ts, "Promise<GqlResult<T>>")}{
  return fetchWithGql${G(ts, "T")}(mutation, { ...options, variables });
}
`;
}
