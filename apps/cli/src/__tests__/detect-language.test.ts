import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectProjectLanguage } from "../lib/utils/detect-language.js";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

describe("detectProjectLanguage", () => {
  const testDir = "/tmp/swoff-test-lang";

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  });

  it("detects TypeScript when tsconfig.json exists", () => {
    writeFileSync(join(testDir, "tsconfig.json"), "{}");
    expect(detectProjectLanguage(testDir)).toBe("ts");
  });

  it("detects TypeScript when typescript is in devDependencies", () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ devDependencies: { typescript: "^5.0.0" } }),
    );
    expect(detectProjectLanguage(testDir)).toBe("ts");
  });

  it("detects TypeScript when typescript is in dependencies", () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ dependencies: { typescript: "^5.0.0" } }),
    );
    expect(detectProjectLanguage(testDir)).toBe("ts");
  });

  it("detects TypeScript when .ts files exist in src/", () => {
    mkdirSync(join(testDir, "src"), { recursive: true });
    writeFileSync(join(testDir, "src", "index.ts"), "console.log('hi')");
    expect(detectProjectLanguage(testDir)).toBe("ts");
  });

  it("detects TypeScript when .tsx files exist in src/", () => {
    mkdirSync(join(testDir, "src"), { recursive: true });
    writeFileSync(join(testDir, "src", "App.tsx"), "export default function App() {}");
    expect(detectProjectLanguage(testDir)).toBe("ts");
  });

  it("defaults to JavaScript when no TypeScript indicators found", () => {
    writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test" }));
    expect(detectProjectLanguage(testDir)).toBe("js");
  });

  it("returns js for empty directory", () => {
    expect(detectProjectLanguage(testDir)).toBe("js");
  });

  it("prefers tsconfig.json over package.json detection", () => {
    writeFileSync(join(testDir, "tsconfig.json"), "{}");
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0" } }),
    );
    expect(detectProjectLanguage(testDir)).toBe("ts");
  });
});
