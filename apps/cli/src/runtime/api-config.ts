export function generateApiConfigCode(): string {
  return `/**
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

export const API_BASE = "";
`;
}
