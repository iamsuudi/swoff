import { GeneratorContext, writeFile } from "./context.js";
import { generateGqlWrapperCode } from "../../../runtime/gql-wrapper.js";

export function generateGqlWrapper(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const endpoints = ctx.config.features.caching.graphql.endpoints;

  const code = generateGqlWrapperCode({ ts, ext }, endpoints);

  writeFile(ctx, `graphql/index.${ext}`, code);
}
