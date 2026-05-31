/**
 * Generates invalidation-tags.{js|ts} — pattern-based tag generation with
 * configurable glob patterns, prefix skipping, singularization, and cascading.
 */

import { GeneratorContext, writeFile } from "./context.js";

interface PatternEntry {
  regex: string;
  params: string[];
  templates: string[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function compilePatternEntry(
  rawPattern: string,
  tagTemplates: string[],
): PatternEntry | null {
  const rawParts = rawPattern.split("/");
  const parts = rawParts.filter((p) => p !== "");
  const paramNames: string[] = [];
  const regexParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === "**") {
      regexParts.push("(?:\\/[^/]+)*");
      continue;
    }

    if (regexParts.length > 0) {
      regexParts.push("\\/");
    }

    if (part === "*") {
      regexParts.push("[^/]+");
    } else if (part.startsWith(":")) {
      paramNames.push(part.slice(1));
      regexParts.push("([^/]+)");
    } else if (part.includes("{")) {
      const close = part.indexOf("}");
      if (close !== -1) {
        const inner = part.slice(part.indexOf("{") + 1, close);
        const alternatives = inner.split(",").map((s) => escapeRegex(s.trim()));
        regexParts.push("(?:" + alternatives.join("|") + ")");
      } else {
        regexParts.push(escapeRegex(part));
      }
    } else {
      regexParts.push(escapeRegex(part));
    }
  }

  if (regexParts.length === 0) return null;

  const hasLeadingSlash = rawPattern.startsWith("/");
  const regex = (hasLeadingSlash ? "^\\/" : "^") + regexParts.join("") + "$";

  // Validate template params match captured params
  const templatePlaceholders = new Set<string>();
  for (const tmpl of tagTemplates) {
    const matches = tmpl.match(/\{(\w+)\}/g);
    if (matches) {
      for (const m of matches) {
        templatePlaceholders.add(m.slice(1, -1));
      }
    }
  }
  for (const ph of templatePlaceholders) {
    if (!paramNames.includes(ph)) {
      return null;
    }
  }

  return { regex, params: paramNames, templates: tagTemplates };
}

function generatePatternCode(patterns: Record<string, string[]>): string {
  const entries: string[] = [];
  for (const [pattern, templates] of Object.entries(patterns)) {
    const compiled = compilePatternEntry(pattern, templates);
    if (compiled) {
      entries.push(
        `  { re: new RegExp("${compiled.regex.replace(/\\/g, "\\\\")}"), params: ${JSON.stringify(compiled.params)}, templates: ${JSON.stringify(compiled.templates)} }`,
      );
    }
  }
  return "[\n" + entries.join(",\n") + "\n]";
}

function generateSingularizationCode(
  singularization: Record<string, string>,
): string {
  if (!singularization || Object.keys(singularization).length === 0)
    return "null";
  return JSON.stringify(singularization);
}

function generateCascadingCode(cascading: Record<string, string[]>): string {
  if (!cascading || Object.keys(cascading).length === 0) return "null";
  return JSON.stringify(cascading);
}

export function generateInvalidationTags(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const tiConfig = ctx.config.features.tagInvalidation;

  const prefixes = tiConfig.prefixes ?? [
    "api",
    "v1",
    "v2",
    "v3",
    "rest",
    "graphql",
    "gql",
  ];
  const patterns = tiConfig.patterns ?? {};
  const singularization = tiConfig.singularization ?? {};
  const cascading = tiConfig.cascading ?? {};

  const patternCode = generatePatternCode(patterns);
  const singularizationCode = generateSingularizationCode(singularization);
  const cascadingCode = generateCascadingCode(cascading);
  const prefixesCode = JSON.stringify(prefixes);

  const code = `/**
 * Swoff Invalidation Tags Helper
 * Pattern-based tag generation from URLs with configurable glob patterns,
 * prefix skipping, singularization, and cascading invalidation.
 *
 * Usage:
 *   import { generateTags, invalidateUrl } from './swoff/invalidation-tags.${ext}';
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

import { invalidateByTags } from "./cache.${ext}";
${ts ? `
interface TagPattern {
  re: RegExp;
  params: string[];
  templates: string[];
}
` : ""}
// Pattern entries compiled from swoff.config.json
const TAG_PATTERNS${T("TagPattern[]")} = ${patternCode};

// URL path prefixes to skip during tag generation
const SKIP_PREFIXES = ${prefixesCode};

// Custom singularization map (plural → singular)
const SINGULARIZATION${T("Record<string, string> | null")} = ${singularizationCode};

// Cascading invalidation map (tag → dependent tags)
const CASCADING${T("Record<string, string[]> | null")} = ${cascadingCode};

/** Generate cache invalidation tags from a URL path. Tries configured patterns first, falls back to segment-based generation. */
export function generateTags(url${T("string | URL")})${R("string[]")}{
  const parsed = typeof url === "string" ? new URL(url, window.location.origin) : url;
  const path = parsed.pathname;

  // Try configured patterns first
  for (const entry of TAG_PATTERNS) {
    const match = path.match(entry.re);
    if (match) {
      const params${T("Record<string, string>")} = {};
      for (let i = 0; i < entry.params.length; i++) {
        params[entry.params[i]] = match[i + 1];
      }
      return entry.templates.map((tmpl) => {
        return tmpl.replace(/\\{(\\w+)\\}/g, (_, key) => params[key] ?? "");
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
    tags.push(\`\${singular}:\${id}\`);
  }

  for (let i = 2; i < resourceSegments.length; i++) {
    if (isNaN(Number(resourceSegments[i]))) {
      tags.push(resourceSegments[i]);
    }
  }

  return tags;
}

/** Generate tags prefixed by HTTP method. e.g. POST /api/todos → ["post-todos"]. */
export function generateTagsFromMethod(method${T("string")}, url${T("string | URL")})${R("string[]")}{
  const tags = generateTags(url);
  if (method === "GET" || method === "HEAD") return tags;
  return tags.map((tag) => \`\${method.toLowerCase()}-\${tag}\`);
}

/** Invalidate cached responses related to a URL, including cascading dependencies. */
export async function invalidateUrl(url${T("string | URL")})${R("Promise<void>")}{
  const tags = generateTags(url);
  const allTags = CASCADING ? expandCascading(tags) : tags;
  await invalidateByTags(allTags);
}

/** Invalidate cached responses tagged with method-prefixed tags, including cascading dependencies. */
export async function invalidateByMethod(method${T("string")}, url${T("string | URL")})${R("Promise<void>")}{
  const tags = generateTagsFromMethod(method, url);
  const allTags = CASCADING ? expandCascading(tags) : tags;
  await invalidateByTags(allTags);
}

/** Expand tags with their cascading dependencies, deduplicated. */
export function expandCascading(tags${T("string[]")})${R("string[]")}{
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
export async function getUrlsForTag(tag${T("string")})${R("Promise<{ url: string; actualUrl: string }[]>")}{
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
export async function getTagsForUrl(url${T("string")})${R("Promise<string[]>")}{
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
export async function invalidateMatching(glob${T("string")})${R("Promise<void>")}{
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return;
  controller.postMessage({
    type: "INVALIDATE_MATCHING",
    glob,
  });
}
`;

  writeFile(ctx, `invalidation-tags.${ext}`, code);
}
