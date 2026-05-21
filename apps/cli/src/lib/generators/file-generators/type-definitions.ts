/**
 * Generates swoff.d.ts - TypeScript type declarations.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateTypeDefinitions(ctx: GeneratorContext): void {
  if (ctx.ext !== "ts") return;

  const code = `interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
    latestSWVersion?: string;
    currentSWVersion?: string;
    swRegisteredVersion?: string;
    swAvailableVersion?: string;
    swUpdateRequired?: boolean;
    swMinSupportedVersion?: string;
    swReady?: boolean;
    swError?: boolean;
  }
}

export interface SWOFFCache {
  get(key: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
  delete(request: Request | string): Promise<boolean>;
}

export interface SWOFF {
  cache: SWOFFCache;
  network: {
    fetch(request: Request | string, options?: RequestInit): Promise<Response>;
  };
}

export interface FetchWithCacheOptions extends RequestInit {
  strategy?: "read" | "mutation";
  tags?: string[];
  staleWhileRevalidate?: boolean;
}

export interface MutationQueueItem {
  id: string;
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  previousData: unknown | null;
  timestamp: number;
  retryCount: number;
  tags: string[];
  storeName: string | null;
  tempId: string | null;
}

export interface MutationQueueResult {
  succeeded: number;
  failed: number;
}

export {};
`;

  writeFile(ctx, "swoff.d.ts", code);
}
