export function generateTypeDefinitionsCode(): string {
  return `
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
  // Network Information API
  interface NetworkInformation extends EventTarget {
    readonly effectiveType: "slow-2g" | "2g" | "3g" | "4g";
    readonly type: "bluetooth" | "cellular" | "ethernet" | "none" | "wifi" | "wimax" | "other" | "unknown";
    readonly downlink: number;
    readonly downlinkMax: number;
    readonly rtt: number;
    readonly saveData: boolean;
    onchange: ((this: NetworkInformation, ev: Event) => unknown) | null;
  }

  interface Navigator {
    readonly connection?: NetworkInformation;
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    "sw-update-available": CustomEvent<{ version: string }>;
    "sw-progress": CustomEvent<{ percent: number; downloaded: number; total: number }>;
    "sw-ready": CustomEvent;
    "sw-error": CustomEvent;
    "sw-version-detected": CustomEvent;
    "sw-auth-state-change": CustomEvent;
    "mutation-sync-complete": CustomEvent<{ succeeded: number; failed: number }>;
    "mutation-queue-changed": CustomEvent;
    "cache-invalidated": CustomEvent<{ tags?: string[] }>;
    "fetch-count-changed": CustomEvent<{ count: number }>;
    "mutation-state-changed": CustomEvent<{ id: string; status: string; error?: Error; data?: unknown }>;
    "background-sync-complete": CustomEvent<{ succeeded: number; failed: number }>;
    "swoff:reset-start": CustomEvent;
    "swoff:reset-complete": CustomEvent<{ unregistered: boolean; reregistered: boolean; warnings: string[] }>;
    "push-subscription-changed": CustomEvent<{ subscribed: boolean }>;
    "push-permission-changed": CustomEvent<{ permission: NotificationPermission }>;
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
}

export type MutationStatus = "idle" | "pending" | "success" | "error";

export interface MutationState {
  id: string;
  status: MutationStatus;
  error: Error | null;
  data: unknown;
  timestamp: number;
}

export interface ResetSwoffOptions {
  clearCache?: boolean;
  clearIdb?: boolean;
  clearStorage?: boolean;
  unregisterSW?: boolean;
}

export interface GqlOptions {
  variables?: Record<string, unknown>;
  tags?: string[];
  auth?: boolean;
  queueOffline?: boolean;
  invalidate?: 'auto' | string[] | false;
}

export interface GqlResult<T> {
  data: T;
  fromCache: boolean;
}

export interface MutationQueueItem {
  id: string;
  method: string;
  url: string;
  body: unknown;
  bodyType?: "json" | "formdata" | "blob" | "buffer" | "text";
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
  nextRetryAt?: number;
  tags: string[];
}

export interface MutationQueueResult {
  succeeded: number;
  failed: number;
  total?: number;
}

export {};
`;
}
