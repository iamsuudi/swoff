import { describe, it, expect, beforeEach } from "vitest";
import { matchGlob, clearGlobCache } from "../lib/shared/glob-matcher";

beforeEach(() => {
  clearGlobCache();
});

describe("matchGlob", () => {
  describe("wildcard (*)", () => {
    it("matches single segment", () => {
      expect(matchGlob("/api/users", "/api/*")).toBe(true);
    });

    it("does not cross segment boundary", () => {
      expect(matchGlob("/api/users/123", "/api/*")).toBe(false);
    });

    it("matches within segment", () => {
      expect(matchGlob("/api/users/123", "/api/users/*")).toBe(true);
    });
  });

  describe("globstar (**)", () => {
    it("matches across segments", () => {
      expect(matchGlob("/api/users/123/posts", "/api/users/**")).toBe(true);
    });

    it("matches deep nesting", () => {
      expect(matchGlob("/api/v1/users/123/posts/456", "/api/**")).toBe(true);
    });

    it("matches zero segments", () => {
      expect(matchGlob("/api", "/api/**")).toBe(true);
    });
  });

  describe("single char (?)", () => {
    it("matches exactly one char", () => {
      expect(matchGlob("/api/users/123", "/api/users/???")).toBe(true);
    });

    it("fails if wrong length", () => {
      expect(matchGlob("/api/users/12", "/api/users/???")).toBe(false);
    });

    it("does not cross segments", () => {
      expect(matchGlob("/api/users/1/2", "/api/users/?")).toBe(false);
    });
  });

  describe("alternation ({a,b})", () => {
    it("matches any alternative", () => {
      expect(matchGlob("/api/users", "/api/{users,posts}")).toBe(true);
      expect(matchGlob("/api/posts", "/api/{users,posts}")).toBe(true);
    });

    it("rejects non-matching", () => {
      expect(matchGlob("/api/comments", "/api/{users,posts}")).toBe(false);
    });
  });

  describe("negation (!)", () => {
    it("inverts match result", () => {
      expect(matchGlob("/api/internal/health", "!/api/internal/**")).toBe(false);
    });

    it("allows non-matching paths", () => {
      expect(matchGlob("/api/users/123", "!/api/internal/**")).toBe(true);
    });
  });

  describe("concrete paths", () => {
    it("matches exact path", () => {
      expect(matchGlob("/api/users", "/api/users")).toBe(true);
    });

    it("rejects different path", () => {
      expect(matchGlob("/api/users/123", "/api/users")).toBe(false);
    });
  });

  describe("complex patterns", () => {
    it("matches nested with wildcards", () => {
      expect(matchGlob("/api/v2/users/123", "/api/**/users/*")).toBe(true);
    });

    it("matches deep nested with globstar", () => {
      expect(matchGlob("/a/b/c/d/e", "/a/**/e")).toBe(true);
    });

    it("matches with multiple wildcards", () => {
      expect(matchGlob("/api/users/123/posts/456", "/api/*/123/*/456")).toBe(true);
    });
  });

  describe("alternation in nested paths", () => {
    it("matches with globstar and alternation", () => {
      expect(matchGlob("/api/v1/users/123", "/api/**/{users,posts}/*")).toBe(true);
      expect(matchGlob("/api/v1/posts/456", "/api/**/{users,posts}/*")).toBe(true);
    });

    it("rejects when alternation does not match", () => {
      expect(matchGlob("/api/v1/comments/789", "/api/**/{users,posts}/*")).toBe(false);
    });
  });
});
