import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import rsc from '@vitejs/plugin-rsc'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
      prerender: {
        routes: ['/'],
      },
      rollupConfig: { external: [/^@sentry\//] },
    }),
    tailwindcss(),
    rsc({ serverHandler: false }),
    tanstackStart({
      rsc: {
        enabled: true,
      },
    }),
    viteReact(),
  ],
})

export default config
