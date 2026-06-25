import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import mdx from "fumadocs-mdx/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    mdx(await import("./source.config")),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          crawlLinks: true,
        },
      },
      pages: [
        { path: "/" },
        { path: "/docs" },
        { path: "/about" },
        { path: "/showcase" },
        { path: "/offline" },
      ],
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting for guides on hosting
    netlify(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: "tslib/tslib.es6.js",
    },
  },
});
