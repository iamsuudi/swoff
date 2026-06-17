import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: (
        <div className="flex items-baseline-last">
          <img
            src="/swoff-black.svg"
            alt="Swoff"
            className="h-5 w-auto brightness-200 dark:hidden"
          />
          <img
            src="/swoff-white.svg"
            alt="Swoff"
            className="hidden h-5 w-auto brightness-200 dark:inline"
          />
          <span className="text-[10px] -ml-3">{appName}</span>
        </div>
      ),
    },

    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
