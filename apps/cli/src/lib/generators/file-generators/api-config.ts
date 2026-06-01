import { GeneratorContext, writeFile } from "./context.js";

export function generateApiConfig(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const apiBaseUrl = ctx.config.apiBaseUrl || "";

  const code = `/**
 * Swoff Central Config
 *
 * Edit API_BASE for per-environment overrides:
 *   Vite:      import.meta.env.VITE_SWOFF_API_BASE
 *   CRA:       process.env.REACT_APP_SWOFF_API_BASE
 *   Next.js:   process.env.NEXT_PUBLIC_SWOFF_API_BASE
 *   Remix:     process.env.SWOFF_API_BASE
 *   SvelteKit: import.meta.env.VITE_SWOFF_API_BASE
 *   Angular:   process.env.NG_APP_SWOFF_API_BASE
 *   Deno:      Deno.env.get("SWOFF_API_BASE")
 */

export const API_BASE = "${apiBaseUrl}";
`;

  writeFile(ctx, `config.${ext}`, code);
}
