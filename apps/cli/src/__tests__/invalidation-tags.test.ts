import { describe, it, expect } from "vitest";

// Replicate the generateTags logic for testing
const API_PREFIXES = ["api", "v1", "v2", "v3", "rest", "graphql", "gql"];

function generateTags(url: string): string[] {
  const parsed = new URL(url, "http://example.com");
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return ["root"];

  let startIdx = 0;
  while (startIdx < segments.length && API_PREFIXES.includes(segments[startIdx])) {
    startIdx++;
  }

  const resourceSegments = segments.slice(startIdx);
  if (resourceSegments.length === 0) return ["root"];

  const tags: string[] = [];
  tags.push(resourceSegments[0]);

  if (resourceSegments.length >= 2 && !isNaN(Number(resourceSegments[1]))) {
    const collection = resourceSegments[0];
    const id = resourceSegments[1];
    const singular = collection.replace(/s$/, "");
    tags.push(`${singular}:${id}`);
  }

  for (let i = 2; i < resourceSegments.length; i++) {
    if (isNaN(Number(resourceSegments[i]))) {
      tags.push(resourceSegments[i]);
    }
  }

  return tags;
}

describe("generateTags", () => {
  describe("basic URLs", () => {
    it("returns root tag for root path", () => {
      expect(generateTags("/")).toEqual(["root"]);
    });

    it("generates collection tag from simple path", () => {
      expect(generateTags("/todos")).toEqual(["todos"]);
    });

    it("generates collection tag from API path", () => {
      expect(generateTags("/api/todos")).toEqual(["todos"]);
    });

    it("generates resource tag with ID", () => {
      expect(generateTags("/api/todos/42")).toEqual(["todos", "todo:42"]);
    });

    it("generates sub-resource tags", () => {
      expect(generateTags("/api/todos/42/comments")).toEqual(["todos", "todo:42", "comments"]);
    });
  });

  describe("API prefix skipping", () => {
    it("skips /api prefix", () => {
      expect(generateTags("/api/users/123")).toEqual(["users", "user:123"]);
    });

    it("skips /v1 prefix", () => {
      expect(generateTags("/v1/users/123")).toEqual(["users", "user:123"]);
    });

    it("skips /v2 prefix", () => {
      expect(generateTags("/v2/users/123")).toEqual(["users", "user:123"]);
    });

    it("skips multiple prefixes", () => {
      expect(generateTags("/api/v1/users/123")).toEqual(["users", "user:123"]);
    });

    it("skips /graphql prefix", () => {
      expect(generateTags("/graphql")).toEqual(["root"]);
    });

    it("skips /rest prefix", () => {
      expect(generateTags("/rest/items/456")).toEqual(["items", "item:456"]);
    });
  });

  describe("pluralization", () => {
    it("singularizes collection name for resource tag", () => {
      expect(generateTags("/api/posts/1")).toEqual(["posts", "post:1"]);
    });

    it("handles non-plural collection names", () => {
      expect(generateTags("/api/data/1")).toEqual(["data", "data:1"]);
    });

    it("handles nested resources", () => {
      expect(generateTags("/api/users/123/posts/456")).toEqual([
        "users",
        "user:123",
        "posts",
      ]);
    });
  });

  describe("edge cases", () => {
    it("handles query parameters", () => {
      expect(generateTags("/api/todos?status=active")).toEqual(["todos"]);
    });

    it("handles trailing slashes", () => {
      expect(generateTags("/api/todos/42/")).toEqual(["todos", "todo:42"]);
    });

    it("handles full URLs", () => {
      expect(generateTags("https://example.com/api/todos/42")).toEqual([
        "todos",
        "todo:42",
      ]);
    });
  });
});
