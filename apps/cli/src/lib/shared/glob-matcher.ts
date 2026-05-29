const patternCache = new Map<string, RegExp>();

function escapeRegex(str: string): string {
  return str.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function segmentToRegex(segment: string): string {
  let out = "";
  let i = 0;
  while (i < segment.length) {
    const ch = segment[i];
    if (ch === "*") {
      out += "[^/]*";
      i++;
    } else if (ch === "?") {
      out += "[^/]";
      i++;
    } else if (ch === "{") {
      const close = segment.indexOf("}", i);
      if (close === -1) {
        out += escapeRegex(ch);
        i++;
      } else {
        const inner = segment.slice(i + 1, close);
        const parts = inner.split(",").map((s) => escapeRegex(s.trim()));
        out += "(?:" + parts.join("|") + ")";
        i = close + 1;
      }
    } else {
      out += escapeRegex(ch);
      i++;
    }
  }
  return out;
}

function globToRegex(pattern: string): RegExp {
  const cached = patternCache.get(pattern);
  if (cached) return cached;

  const negate = pattern.startsWith("!");
  const body = negate ? pattern.slice(1) : pattern;

  const hasLeadingSlash = body.startsWith("/");
  const raw = hasLeadingSlash ? body.slice(1) : body;
  const segments = raw.split("/").filter((s) => s.length > 0);

  let regexStr = "^";
  if (hasLeadingSlash) regexStr += "\\/";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg === "**") {
      regexStr += "(?:\\/.*)?";
    } else {
      if (i > 0 && segments[i - 1] !== "**") {
        regexStr += "\\/";
      }
      regexStr += segmentToRegex(seg);
    }
  }

  regexStr += "$";

  const re = new RegExp(regexStr);
  patternCache.set(pattern, re);
  return re;
}

export function matchGlob(path: string, pattern: string): boolean {
  const re = globToRegex(pattern);
  const result = re.test(path);
  if (pattern.startsWith("!")) return !result;
  return result;
}

export function clearGlobCache(): void {
  patternCache.clear();
}
