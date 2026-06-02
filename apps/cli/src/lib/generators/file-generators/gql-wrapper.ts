import { GeneratorContext, writeFile } from "./context.js";
import { generateGqlWrapperCode } from "../../../runtime/gql-wrapper.js";

export function generateGqlWrapper(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const endpoint = ctx.config.features.graphql.endpoint;

  const code = generateGqlWrapperCode({ ts, ext }, endpoint);

  writeFile(ctx, `gql-wrapper.${ext}`, code);
}
