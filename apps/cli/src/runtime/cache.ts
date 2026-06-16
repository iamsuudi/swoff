import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

function generateCascadingCode(cascading: Record<string, string[]>): string {
  if (!cascading || Object.keys(cascading).length === 0) return "null";
  return JSON.stringify(cascading);
}

export function generateCacheCode(
  ctx: RuntimeContext,
  cascading: Record<string, string[]>,
): string {
  const { ext, ts } = ctx;
  const cascadingCode = generateCascadingCode(cascading);

  return `/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation, URL-based invalidation,
 * cascading dependency expansion, introspection, and glob matching.
 *
 * Usage:
 *   import { invalidateByTag, invalidateByTags, invalidateUrl } from './swoff/cache/invalidate.${ext}';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 *   await invalidateUrl("/api/todos/42");
 */

import { generateTags, generateTagsFromMethod } from "./tags.${ext}";

// Cascading invalidation map (tag → dependent tags)
const CASCADING${T(ts, "Record<string, string[]> | null")} = ${cascadingCode};

/** Invalidate all cached responses tagged with the given tag. Sends INVALIDATE_TAG to the SW; the client-injector dispatches cache-invalidated on SW confirmation. */
export async function invalidateByTag(tag${T(ts, "string")})${R(ts, "Promise<void>")}{
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });
}

/** Invalidate all cached responses matching any of the given tags. */
export async function invalidateByTags(tags${T(ts, "string[]")})${R(ts, "Promise<void>")}{
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}

/** Expand tags with their cascading dependencies, deduplicated. */
export function expandCascading(tags${T(ts, "string[]")})${R(ts, "string[]")}{
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

/** Invalidate cached responses related to a URL, including cascading dependencies. */
export async function invalidateUrl(url${T(ts, "string | URL")})${R(ts, "Promise<void>")}{
  const tags = generateTags(url);
  const allTags = CASCADING ? expandCascading(tags) : tags;
  await invalidateByTags(allTags);
}

/** Invalidate cached responses tagged with method-prefixed tags, including cascading dependencies. */
export async function invalidateByMethod(method${T(ts, "string")}, url${T(ts, "string | URL")})${R(ts, "Promise<void>")}{
  const tags = generateTagsFromMethod(method, url);
  const allTags = CASCADING ? expandCascading(tags) : tags;
  await invalidateByTags(allTags);
}

/** Invalidate all cached responses whose URL matches the given glob pattern. */
export async function invalidateMatching(glob${T(ts, "string")})${R(ts, "Promise<void>")}{
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return;
  controller.postMessage({
    type: "INVALIDATE_MATCHING",
    glob,
  });
}

/** Introspect: get all URLs cached under a given tag. */
export async function getUrlsForTag(tag${T(ts, "string")})${R(ts, "Promise<{ url: string; actualUrl: string }[]>")}{
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return [];
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); resolve([]); }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data.urls || []);
    };
    controller.postMessage(
      { type: "GET_URLS_FOR_TAG", tag },
      [channel.port2],
    );
  });
}

/** Introspect: get all tags associated with a given URL. */
export async function getTagsForUrl(url${T(ts, "string")})${R(ts, "Promise<string[]>")}{
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return [];
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); resolve([]); }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data.tags || []);
    };
    controller.postMessage(
      { type: "GET_TAGS_FOR_URL", url },
      [channel.port2],
    );
  });
}
`;
}
