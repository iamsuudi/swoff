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
        title: "Swoff - Build Offline-First Web Apps",
      },
      {
        name: "description",
        content:
          "A zero-dependency blueprint for building offline-first web applications that feel like native apps. Versioned service workers, user-consented updates, full offline capability.",
      },
      {
        property: "og:title",
        content: "Swoff - Build Offline-First Web Apps",
      },
      {
        property: "og:description",
        content:
          "Zero dependencies. Copy-paste patterns. Own your code. Build web apps that work offline like native apps.",
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
        content: "Swoff - Build Offline-First Web Apps",
      },
      {
        name: "twitter:description",
        content:
          "Zero dependencies. Copy-paste patterns. Build offline-first web apps that feel like native apps.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
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
