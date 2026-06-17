import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import appCss from "@/styles/app.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Swoff — Offline-First PWA Toolchain",
      },
      {
        name: "description",
        content:
          "A config-driven code generation toolchain for offline-first PWAs. Generate an auditable service worker and client code from a single config file. Zero runtime dependencies, works with any stack.",
      },
      {
        property: "og:title",
        content: "Swoff — Offline-First PWA Toolchain",
      },
      {
        property: "og:description",
        content:
          "Config-driven code generation for offline-first PWAs. No runtime deps, works with any frontend or backend.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "Swoff — Offline-First PWA Toolchain",
      },
      {
        name: "twitter:description",
        content:
          "Generate an auditable service worker and client code from a single config file. Zero runtime deps, works with any stack.",
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/swoff.png' },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
