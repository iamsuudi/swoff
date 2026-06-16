import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

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

export function generateInvalidationTagsCode(
  ctx: RuntimeContext,
  prefixes: string[],
  patterns: Record<string, string[]>,
  singularization: Record<string, string>,
): string {
  const { ext, ts } = ctx;

  const patternCode = generatePatternCode(patterns);
  const singularizationCode = generateSingularizationCode(singularization);
  const prefixesCode = JSON.stringify(prefixes);

  return `/**
 * Swoff Invalidation Tags Helper
 * Segment- and pattern-based tag generation from URLs.
 *
 * Usage:
 *   import { generateTags } from './swoff/cache/tags.${ext}';
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
 *   // Generate method-prefixed tags for mutations
 *   generateTagsFromMethod("POST", "/api/todos");  // ["post-todos"]
 */
${ts ? `
interface TagPattern {
  re: RegExp;
  params: string[];
  templates: string[];
}
` : ""}
// Pattern entries compiled from swoff.config.json
const TAG_PATTERNS${T(ts, "TagPattern[]")} = ${patternCode};

// URL path prefixes to skip during tag generation
const SKIP_PREFIXES = ${prefixesCode};

// Custom singularization map (plural → singular)
const SINGULARIZATION${T(ts, "Record<string, string> | null")} = ${singularizationCode};

/** Generate cache invalidation tags from a URL path. Tries configured patterns first, falls back to segment-based generation. */
export function generateTags(url${T(ts, "string | URL")})${R(ts, "string[]")}{
  const base = typeof window !== "undefined" ? window.location.origin : "";
  let parsed;
  try {
    parsed = typeof url === "string" ? new URL(url, base) : url;
  } catch {
    return [];
  }
  const path = parsed.pathname;

  // Try configured patterns first
  for (const entry of TAG_PATTERNS) {
    const match = path.match(entry.re);
    if (match) {
      const params${T(ts, "Record<string, string>")} = {};
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
export function generateTagsFromMethod(method${T(ts, "string")}, url${T(ts, "string | URL")})${R(ts, "string[]")}{
  const tags = generateTags(url);
  if (method === "GET" || method === "HEAD") return tags;
  return tags.map((tag) => \`\${method.toLowerCase()}-\${tag}\`);
}
`;
}
