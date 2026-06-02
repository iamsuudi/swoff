/**
 * Generates invalidation-tags.{js|ts} — pattern-based tag generation with
 * configurable glob patterns, prefix skipping, singularization, and cascading.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateInvalidationTagsCode } from "../../../runtime/invalidation-tags.js";

export function generateInvalidationTags(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";

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

  const code = generateInvalidationTagsCode(
    { ts, ext },
    prefixes,
    patterns,
    singularization,
    cascading,
  );

  writeFile(ctx, `invalidation-tags.${ext}`, code);
}
