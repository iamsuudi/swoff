
// Background Sync API types
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface SyncEvent extends Event {
  readonly tag: string;
  readonly lastChance: boolean;
}

interface ServiceWorkerGlobalScope {
  onsync: ((this: ServiceWorkerGlobalScope, ev: SyncEvent) => unknown) | null;
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
    pwaInstallable?: boolean;
    latestSWVersion?: string;
    currentSWVersion?: string;
    swRegisteredVersion?: string;
    swAvailableVersion?: string;
    swUpdateRequired?: boolean;
    swMinSupportedVersion?: string;
    swReady?: boolean;
    swError?: boolean;
    swAuthState?: "authenticated" | "unauthenticated" | "loading";
    swCurrentUser?: Record<string, unknown> | null;
    SyncManager?: { new(): SyncManager };
  }

  // Extend ServiceWorkerRegistration in the global scope for TS
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager;
  }
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
  timestamp: number;
  retryCount: number;
  tags: string[];
}

export interface MutationQueueResult {
  succeeded: number;
  failed: number;
}

export {};
