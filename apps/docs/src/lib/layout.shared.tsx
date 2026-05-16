import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: (
        <div className="flex items-center gap-1">
          <img
            src="/swoff.png"
            alt="Swoff"
            className="h-5 w-auto brightness-200"
          />{" "}
          {appName}
        </div>
      ),
    },

    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
