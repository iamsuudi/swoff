import { remarkTypeScriptToJavaScript } from "fumadocs-docgen/remark-ts2js";
import remarkDirective from "remark-directive";
import {
  remarkDirectiveAdmonition,
  remarkMdxFiles,
  remarkNpm,
  remarkSteps,
  remarkStructure,
} from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkDirective,
      remarkDirectiveAdmonition,
      remarkMdxFiles,
      remarkNpm,
      remarkSteps,
      remarkStructure,
      remarkTypeScriptToJavaScript,
    ],
    remarkNpmOptions: {
      persist: {
        id: "package-manager",
      },
    },
    remarkCodeTabOptions: {
      parseMdx: true,
    },
  },
  plugins: [lastModified()],
});
