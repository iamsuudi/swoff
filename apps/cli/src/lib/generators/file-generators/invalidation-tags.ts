/**
 * Generates invalidation-tags.{js|ts} — pattern-based tag generation with
 * configurable glob patterns, prefix skipping, singularization, and cascading.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateInvalidationTagsCode } from "../../../runtime/invalidation-tags.js";

export function generateInvalidationTags(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";

  const tiConfig = ctx.config.features.caching.tagInvalidation;

  const prefixes = tiConfig.skipPrefixes ?? [
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

  const code = generateInvalidationTagsCode(
    { ts, ext },
    prefixes,
    patterns,
    singularization,
  );

  writeFile(ctx, `cache/tags.${ext}`, code);
}
