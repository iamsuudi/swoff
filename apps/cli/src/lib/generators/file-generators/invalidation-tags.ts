/**
 * Generates invalidation-tags.js - URL-based tag generation helper.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateInvalidationTags(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const code = `/**
 * Swoff Invalidation Tags Helper
 * URL-based tag generation from REST endpoints for automatic cache invalidation.
 *
 * Usage:
 *   import { generateTags, invalidateUrl } from './swoff/invalidation-tags.${ext}';
 *
 *   // Generate tags from URL
 *   generateTags("/api/todos");          // ["todos"]
 *   generateTags("/api/todos/42");       // ["todos", "todo:42"]
 *   generateTags("/api/todos/42/comments"); // ["todos", "todo:42", "comments"]
 *
 *   // Use with fetch wrapper
 *   const data = await fetchWithCache("/api/todos", {
 *     tags: generateTags("/api/todos"),
 *   });
 *
 *   // Invalidate after mutation
 *   await invalidateUrl("/api/todos/42");
 */

import { invalidateByTag, invalidateByTags } from "./cache.${ext}";

export function generateTags(url${T("string | URL")}${R("string[]")}{
  const parsed = typeof url === "string" ? new URL(url, window.location.origin) : url;
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return ["root"];

  const skipPrefixes = ["api", "v1", "v2", "v3", "rest", "graphql", "gql"];
  let startIdx = 0;
  while (startIdx < segments.length && skipPrefixes.includes(segments[startIdx])) {
    startIdx++;
  }

  const resourceSegments = segments.slice(startIdx);
  if (resourceSegments.length === 0) return ["root"];

  const tags = [];

  tags.push(resourceSegments[0]);

  if (resourceSegments.length >= 2 && !isNaN(Number(resourceSegments[1]))) {
    const collection = resourceSegments[0];
    const id = resourceSegments[1];
    const singular = collection.replace(/s$/, "");
    tags.push(\`\${singular}:\${id}\`);
  }

  for (let i = 2; i < resourceSegments.length; i++) {
    if (isNaN(Number(resourceSegments[i]))) {
      tags.push(resourceSegments[i]);
    }
  }

  return tags;
}

export function generateTagsFromMethod(method${T("string")}, url${T("string | URL")}${R("string[]")}{
  const tags = generateTags(url);

  if (method === "GET" || method === "HEAD") {
    return tags;
  }

  return tags.map((tag) => \`\${method.toLowerCase()}-\${tag}\`);
}

export async function invalidateUrl(url${T("string | URL")}${R("Promise<void>")}{
  const tags = generateTags(url);
  await invalidateByTags(tags);
}

export async function invalidateByMethod(method${T("string")}, url${T("string | URL")}${R("Promise<void>")}{
  const tags = generateTagsFromMethod(method, url);
  await invalidateByTags(tags);
}
`;

  writeFile(ctx, `invalidation-tags.${ext}`, code);
}
