/**
 * Swoff Invalidation Tags Helper
 * Pattern-based tag generation from URLs with configurable glob patterns,
 * prefix skipping, singularization, and cascading invalidation.
 *
 * Usage:
 *   import { generateTags, invalidateUrl } from './swoff/cache/tags.ts';
 *
 *   // Generate tags from URL
 *   generateTags("/api/todos");          // ["todos"]
 *   generateTags("/api/todos/42");       // ["todos", "todo:42"]
 *
 *   // Use with fetch wrapper
 *   const data = await fetchWithCache("/api/todos", {
 *     tags: generateTags("/api/todos"),
 *   });
 *
 *   // Invalidate after mutation
 *   await invalidateUrl("/api/todos/42");
 */

import { invalidateByTags } from "./index.ts";

interface TagPattern {
  re: RegExp;
  params: string[];
  templates: string[];
}

// Pattern entries compiled from swoff.config.json
const TAG_PATTERNS: TagPattern[] = [

];

// URL path prefixes to skip during tag generation
const SKIP_PREFIXES = ["api","v1","v2","v3","rest","graphql","gql"];

// Custom singularization map (plural → singular)
const SINGULARIZATION: Record<string, string> | null = null;

// Cascading invalidation map (tag → dependent tags)
const CASCADING: Record<string, string[]> | null = null;

/** Generate cache invalidation tags from a URL path. Tries configured patterns first, falls back to segment-based generation. */
export function generateTags(url: string | URL): string[] {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const parsed = typeof url === "string" ? new URL(url, base) : url;
  const path = parsed.pathname;

  // Try configured patterns first
  for (const entry of TAG_PATTERNS) {
    const match = path.match(entry.re);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < entry.params.length; i++) {
        params[entry.params[i]] = match[i + 1];
      }
      return entry.templates.map((tmpl) => {
        return tmpl.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
      });
    }
  }

  // Fallback: segment-based generation
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return ["root"];

  let startIdx = 0;
  while (startIdx < segments.length && SKIP_PREFIXES.includes(segments[startIdx])) {
    startIdx++;
  }

  const resourceSegments = segments.slice(startIdx);
  if (resourceSegments.length === 0) return ["root"];

  const tags = [];
  tags.push(resourceSegments[0]);

  if (resourceSegments.length >= 2 && !isNaN(Number(resourceSegments[1]))) {
    const collection = resourceSegments[0];
    const id = resourceSegments[1];
    const singular = SINGULARIZATION && SINGULARIZATION[collection] !== undefined
      ? SINGULARIZATION[collection]
      : collection.replace(/s$/, "");
    tags.push(`${singular}:${id}`);
  }

  for (let i = 2; i < resourceSegments.length; i++) {
    if (isNaN(Number(resourceSegments[i]))) {
      tags.push(resourceSegments[i]);
    }
  }

  return tags;
}

/** Generate tags prefixed by HTTP method. e.g. POST /api/todos → ["post-todos"]. */
export function generateTagsFromMethod(method: string, url: string | URL): string[] {
  const tags = generateTags(url);
  if (method === "GET" || method === "HEAD") return tags;
  return tags.map((tag) => `${method.toLowerCase()}-${tag}`);
}

/** Invalidate cached responses related to a URL, including cascading dependencies. */
export async function invalidateUrl(url: string | URL): Promise<void> {
  const tags = generateTags(url);
  const allTags = CASCADING ? expandCascading(tags) : tags;
  await invalidateByTags(allTags);
}

/** Invalidate cached responses tagged with method-prefixed tags, including cascading dependencies. */
export async function invalidateByMethod(method: string, url: string | URL): Promise<void> {
  const tags = generateTagsFromMethod(method, url);
  const allTags = CASCADING ? expandCascading(tags) : tags;
  await invalidateByTags(allTags);
}

/** Expand tags with their cascading dependencies, deduplicated. */
export function expandCascading(tags: string[]): string[] {
  if (!CASCADING) return [...tags];
  const result = new Set(tags);
  for (const tag of tags) {
    const deps = CASCADING[tag];
    if (deps) {
      for (const dep of deps) {
        result.add(dep);
      }
    }
  }
  return [...result];
}

/** Introspect: get all URLs cached under a given tag. */
export async function getUrlsForTag(tag: string): Promise<{ url: string; actualUrl: string }[]> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return [];
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data.urls || []);
    };
    controller.postMessage(
      { type: "GET_URLS_FOR_TAG", tag },
      [channel.port2],
    );
  });
}

/** Introspect: get all tags associated with a given URL. */
export async function getTagsForUrl(url: string): Promise<string[]> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return [];
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data.tags || []);
    };
    controller.postMessage(
      { type: "GET_TAGS_FOR_URL", url },
      [channel.port2],
    );
  });
}

/** Invalidate all cached responses whose URL matches the given glob pattern. */
export async function invalidateMatching(glob: string): Promise<void> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return;
  controller.postMessage({
    type: "INVALIDATE_MATCHING",
    glob,
  });
}
