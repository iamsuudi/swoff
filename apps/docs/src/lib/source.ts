import { loader } from "fumadocs-core/source";
import { docs } from "collections/server";
import { docsContentRoute, docsRoute } from "./shared";
import { Icons } from "@/components/icons";
import { icons } from "lucide-react";
import { createElement } from "react";

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  icon: (name) => {
    if (!name) return null;
    
    // Check custom icons first
    if (name in Icons) {
      const Icon = Icons[name as keyof typeof Icons];
      return createElement(Icon as React.ComponentType<any>);
    }
    
    // Fall back to Lucide icons
    if (name in icons) {
      return createElement(icons[name as keyof typeof icons]);
    }
    
    return null;
  },
});

export function getPageMarkdownUrl(page: (typeof source)["$inferPage"]) {
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join("/")}`,
  };
}

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${page.url})

${processed}`;
}
