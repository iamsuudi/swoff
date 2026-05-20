/**
 * Swoff Files Generator
 *
 * Generates all pattern files (sw-injector, hooks, components, utils, build scripts, manifest)
 * based on swoff.config.json features and project language.
 *
 * CLI Usage:
 *   node swoff-files-generator.js --project-root <path> --package-dir <path> --language <ts|js> --config-path <path>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

interface SwoffConfig {
  enabled: boolean;
  version: string;
  minSupportedVersion: string;
  serviceWorker: {
    autoUpdate: boolean;
    defaultStrategy: string;
    strategies: Record<string, string>;
  };
  features: {
    versionedSw: boolean;
    offlineReads: boolean;
    mutationQueue: boolean;
    backgroundSync: boolean;
    pwa: boolean;
    auth: boolean;
    crossTabSync: boolean;
    tagInvalidation: boolean;
    clientRegistration: boolean;
  };
  build: {
    outputDir: string;
    swFilename: string;
  };
}

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const idx = args.findIndex((arg) => arg === `--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const projectRoot = getArg("project-root") || process.cwd();
const packageDir = getArg("package-dir") || join(dirname(fileURLToPath(import.meta.url)), "../..");
const language = getArg("language") || "ts";
const configPath = getArg("config-path") || join(projectRoot, "swoff.config.json");

const defaultConfig: SwoffConfig = {
  enabled: true,
  version: "from-package",
  minSupportedVersion: "0.0.0",
  serviceWorker: {
    autoUpdate: false,
    defaultStrategy: "cache-first",
    strategies: {},
  },
  features: {
    versionedSw: true,
    offlineReads: true,
    mutationQueue: false,
    backgroundSync: false,
    pwa: true,
    auth: false,
    crossTabSync: true,
    tagInvalidation: true,
    clientRegistration: true,
  },
  build: {
    outputDir: "dist",
    swFilename: "sw",
  },
};

let config: SwoffConfig = defaultConfig;

if (existsSync(configPath)) {
  try {
    config = { ...defaultConfig, ...JSON.parse(readFileSync(configPath, "utf8")) };
  } catch {
    console.warn("Could not parse config, using defaults");
  }
} else {
  console.log("No config found, using defaults");
}

const ext = language === "ts" ? "ts" : "js";
const generatedFiles: string[] = [];

function generateSwInjector(): void {
  const outputDir = join(projectRoot, "src");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  if (language === "ts") {
    const code = `import { useEffect, useState } from 'react';

export function shouldRegister(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export function useServiceWorkerRegistration(options: {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  swPath?: string;
} = {}) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!shouldRegister()) return;

    const register = async () => {
      try {
        const swPath = options.swPath || '/sw.js';
        const reg = await navigator.serviceWorker.register(swPath);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                options.onUpdate?.(reg);
              }
            });
          }
        });

        if (reg.active) {
          options.onSuccess?.(reg);
        } else {
          reg.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              options.onSuccess?.(reg);
            }
          });
        }

        setRegistration(reg);
        setIsReady(true);
      } catch (err) {
        options.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    register();
  }, []);

  return { registration, isReady };
}

export function registerServiceWorker(swPath?: string): Promise<ServiceWorkerRegistration> {
  if (!shouldRegister()) {
    return Promise.reject(new Error('Service workers not supported'));
  }
  return navigator.serviceWorker.register(swPath || '/sw.js');
}

export function unregisterServiceWorker(): Promise<void> {
  return navigator.serviceWorker.ready.then((reg) => {
    return reg.unregister();
  });
}
`;
    writeFileSync(join(outputDir, `sw-injector.${ext}`), code);
    generatedFiles.push(`src/sw-injector.${ext}`);
  } else {
    const code = `export function shouldRegister() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export async function registerServiceWorker(swPath) {
  if (!shouldRegister()) {
    throw new Error('Service workers not supported');
  }
  return navigator.serviceWorker.register(swPath || '/sw.js');
}

export async function unregisterServiceWorker() {
  const reg = await navigator.serviceWorker.ready;
  return reg.unregister();
}

export function useServiceWorkerRegistration(options = {}) {
  const [registration, setRegistration] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!shouldRegister()) return;

    registerServiceWorker(options.swPath)
      .then((reg) => {
        setRegistration(reg);
        setIsReady(true);
        options.onSuccess?.(reg);
      })
      .catch((err) => {
        options.onError?.(err);
      });
  }, []);

  return { registration, isReady };
}
`;
    writeFileSync(join(outputDir, `sw-injector.${ext}`), code);
    generatedFiles.push(`src/sw-injector.${ext}`);
  }
}

function generateSwGeneratorBuildScript(): void {
  const outputDir = join(projectRoot, "swoff");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  if (language === "ts") {
    const code = `#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const SWOFF_CONFIG = 'swoff.config.json';
const DIST_DIR = 'dist';

if (!existsSync(SWOFF_CONFIG)) {
  console.error('Error: swoff.config.json not found');
  console.log('Run "npx @swoff/cli init" to create one');
  process.exit(1);
}

console.log('🔧 Building service worker...');

const proc = spawn(
  'npx',
  ['@swoff/cli', 'generate', '--sw-only'],
  { stdio: 'inherit', shell: true }
);

proc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Service worker build complete');
  } else {
    console.error('❌ Build failed');
    process.exit(code || 1);
  }
});
`;
    writeFileSync(join(outputDir, `sw-generator.${ext}`), code);
    generatedFiles.push(`swoff/sw-generator.${ext}`);
  } else {
    const code = `#!/usr/bin/env node

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const SWOFF_CONFIG = 'swoff.config.json';

if (!existsSync(SWOFF_CONFIG)) {
  console.error('Error: swoff.config.json not found');
  console.log('Run "npx @swoff/cli init" to create one');
  process.exit(1);
}

console.log('🔧 Building service worker...');

const proc = spawn(
  'npx',
  ['@swoff/cli', 'generate', '--sw-only'],
  { stdio: 'inherit', shell: true }
);

proc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Service worker build complete');
  } else {
    console.error('❌ Build failed');
    process.exit(code || 1);
  }
});
`;
    writeFileSync(join(outputDir, `sw-generator.${ext}`), code);
    generatedFiles.push(`swoff/sw-generator.${ext}`);
  }
}

function generateSwTemplate(): void {
  const outputDir = join(projectRoot, "swoff");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const template = `let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[FETCH_HANDLER]]

const SWOFF = {
  cache: {
    async get(key) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(key);
    },
    async put(request, response) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    },
    async delete(key) {
      const cache = await caches.open(CACHE_NAME);
      return cache.delete(key);
    },
    async keys() {
      const cache = await caches.open(CACHE_NAME);
      return cache.keys();
    }
  }
};

if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}
`;
  writeFileSync(join(outputDir, "sw-template.js"), template);
  generatedFiles.push("swoff/sw-template.js");
}

function generateTypeDefinitions(): void {
  if (language !== "ts") return;

  const outputDir = join(projectRoot, "src");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const code = `declare module '*.service-worker' {
  const serviceWorker: ServiceWorkerGlobalScope;
  export default serviceWorker;
}

interface SWOFFCache {
  get(key: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<Response>;
  delete(key: Request | string): Promise<boolean>;
  keys(): Promise<Request[]>;
}

interface SWOFF {
  cache: SWOFFCache;
}

declare const SWOFF: SWOFF | undefined;

declare let CACHE_NAME: string;
declare let ASSETS_TO_CACHE: string[];
`;
  writeFileSync(join(outputDir, "swoff.d.ts"), code);
  generatedFiles.push("src/swoff.d.ts");
}

function generateOfflineHooks(): void {
  const outputDir = join(projectRoot, "src", "hooks");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const useOffline = language === "ts"
    ? `import { useState, useEffect } from 'react';

export interface UseOfflineResult {
  isOnline: boolean;
  isOffline: boolean;
}

export function useOffline(): UseOfflineResult {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
`
    : `import { useState, useEffect } from 'react';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
`;

  writeFileSync(join(outputDir, `useOffline.${ext}`), useOffline);
  generatedFiles.push(`src/hooks/useOffline.${ext}`);

  const useApiData = language === "ts"
    ? `import { useState, useEffect, useCallback } from 'react';

export interface UseApiDataOptions extends RequestInit {
  skip?: boolean;
}

export interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T | null>;
}

export function useApiData<T = unknown>(
  endpoint: string,
  options: UseApiDataOptions = {}
): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (fetchOptions: RequestInit = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint, { ...options, ...fetchOptions });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const result: T = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(new Error(errorMessage));

      if (!navigator.onLine && data) {
        return data;
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(options), data]);

  useEffect(() => {
    if (!options.skip) {
      fetchData();
    }
  }, [endpoint]);

  return { data, loading, error, refetch: fetchData };
}
`
    : `import { useState, useEffect, useCallback } from 'react';

export function useApiData(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (fetchOptions = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint, { ...options, ...fetchOptions });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(new Error(errorMessage));

      if (!navigator.onLine && data) {
        return data;
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(options), data]);

  useEffect(() => {
    if (!options.skip) {
      fetchData();
    }
  }, [endpoint]);

  return { data, loading, error, refetch: fetchData };
}
`;

  writeFileSync(join(outputDir, `useApiData.${ext}`), useApiData);
  generatedFiles.push(`src/hooks/useApiData.${ext}`);
}

function generateMutationQueueHooks(): void {
  const outputDir = join(projectRoot, "src", "hooks");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const useMutationQueue = language === "ts"
    ? `import { useState, useEffect, useCallback } from 'react';

export interface Mutation {
  id: string;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  retries: number;
  data: unknown;
  endpoint: string;
  method?: string;
}

export interface UseMutationQueueOptions {
  onSync?: (mutation: Mutation) => Promise<void>;
  maxRetries?: number;
  storageKey?: string;
  autoSync?: boolean;
}

export interface UseMutationQueueResult {
  queueMutation: (mutation: Omit<Mutation, 'id' | 'timestamp' | 'status' | 'retries'>) => string;
  pendingMutations: Mutation[];
  isSyncing: boolean;
  syncMutations: () => Promise<void>;
  clearQueue: () => void;
  retryMutation: (id: string) => Promise<void>;
}

export function useMutationQueue(options: UseMutationQueueOptions = {}): UseMutationQueueResult {
  const {
    onSync,
    maxRetries = 3,
    storageKey = 'swoff-mutation-queue',
    autoSync = true
  } = options;

  const [pendingMutations, setPendingMutations] = useState<Mutation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPendingMutations(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pendingMutations));
    } catch {
      // ignore
    }
  }, [pendingMutations, storageKey]);

  const queueMutation = useCallback((
    mutation: Omit<Mutation, 'id' | 'timestamp' | 'status' | 'retries'>
  ): string => {
    const newMutation: Mutation = {
      id: \`\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      ...mutation
    };

    setPendingMutations((prev) => [...prev, newMutation]);

    if (autoSync && navigator.onLine) {
      syncMutations();
    }

    return newMutation.id;
  }, [autoSync]);

  const syncMutations = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    const pending = pendingMutations.filter((m) => m.status === 'pending');
    if (pending.length === 0) return;

    setIsSyncing(true);

    for (const mutation of pending) {
      try {
        if (onSync) {
          await onSync(mutation);
        } else {
          await fetch(mutation.endpoint, {
            method: mutation.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mutation.data),
          });
        }
        setPendingMutations((prev) =>
          prev.map((m) => (m.id === mutation.id ? { ...m, status: 'synced' } : m))
        );
      } catch {
        setPendingMutations((prev) =>
          prev.map((m) =>
            m.id === mutation.id
              ? { ...m, retries: m.retries + 1, status: m.retries >= maxRetries ? 'failed' : 'pending' }
              : m
          )
        );
      }
    }

    setIsSyncing(false);
  }, [isSyncing, onSync, maxRetries, pendingMutations]);

  useEffect(() => {
    if (!autoSync) return;

    const handleOnline = () => syncMutations();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncMutations, autoSync]);

  const clearQueue = useCallback(() => {
    setPendingMutations([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const retryMutation = useCallback(async (id: string) => {
    setPendingMutations((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'pending', retries: 0 } : m))
    );
    await syncMutations();
  }, [syncMutations]);

  return { queueMutation, pendingMutations, isSyncing, syncMutations, clearQueue, retryMutation };
}
`
    : `import { useState, useEffect, useCallback } from 'react';

export function useMutationQueue(options = {}) {
  const {
    onSync,
    maxRetries = 3,
    storageKey = 'swoff-mutation-queue',
    autoSync = true
  } = options;

  const [pendingMutations, setPendingMutations] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPendingMutations(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pendingMutations));
    } catch {
      // ignore
    }
  }, [pendingMutations, storageKey]);

  const queueMutation = useCallback((mutation) => {
    const newMutation = {
      id: \`\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      ...mutation
    };

    setPendingMutations((prev) => [...prev, newMutation]);

    if (autoSync && navigator.onLine) {
      syncMutations();
    }

    return newMutation.id;
  }, [autoSync]);

  const syncMutations = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    const pending = pendingMutations.filter((m) => m.status === 'pending');
    if (pending.length === 0) return;

    setIsSyncing(true);

    for (const mutation of pending) {
      try {
        if (onSync) {
          await onSync(mutation);
        } else {
          await fetch(mutation.endpoint, {
            method: mutation.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mutation.data),
          });
        }
        setPendingMutations((prev) =>
          prev.map((m) => (m.id === mutation.id ? { ...m, status: 'synced' } : m))
        );
      } catch {
        setPendingMutations((prev) =>
          prev.map((m) =>
            m.id === mutation.id
              ? { ...m, retries: m.retries + 1, status: m.retries >= maxRetries ? 'failed' : 'pending' }
              : m
          )
        );
      }
    }

    setIsSyncing(false);
  }, [isSyncing, onSync, maxRetries, pendingMutations]);

  useEffect(() => {
    if (!autoSync) return;

    const handleOnline = () => syncMutations();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncMutations, autoSync]);

  const clearQueue = useCallback(() => {
    setPendingMutations([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const retryMutation = useCallback(async (id) => {
    setPendingMutations((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'pending', retries: 0 } : m))
    );
    await syncMutations();
  }, [syncMutations]);

  return { queueMutation, pendingMutations, isSyncing, syncMutations, clearQueue, retryMutation };
}
`;

  writeFileSync(join(outputDir, `useMutationQueue.${ext}`), useMutationQueue);
  generatedFiles.push(`src/hooks/useMutationQueue.${ext}`);
}

function generatePWAComponents(): void {
  const outputDir = join(projectRoot, "src", "components");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const offlineIndicator = `import { useOffline } from '../hooks/useOffline';

export interface OfflineIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  message?: string;
  className?: string;
}

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4'
};

export function OfflineIndicator({
  position = 'bottom-right',
  message = 'You are offline. Some features may be limited.',
  className = ''
}: OfflineIndicatorProps) {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div
      className={\`fixed \${positionClasses[position]} bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 \${className}\`}
      role="alert"
      aria-live="polite"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
`;

  writeFileSync(join(outputDir, "OfflineIndicator.tsx"), offlineIndicator);
  generatedFiles.push("src/components/OfflineIndicator.tsx");

  const pwaInstallButton = `import { useState, useEffect } from 'react';

export interface PWAInstallButtonProps {
  installLabel?: string;
  installedLabel?: string;
  className?: string;
}

export function PWAInstallButton({
  installLabel = 'Install App',
  installedLabel = 'Installed',
  className = ''
}: PWAInstallButtonProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setIsInstallable(false);
    setDeferredPrompt(null);
  };

  if (!isInstallable && !isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalled}
      className={\`fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 disabled:bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium z-50 \${className}\`}
    >
      {isInstalled ? installedLabel : installLabel}
    </button>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
`;

  writeFileSync(join(outputDir, "PWAInstallButton.tsx"), pwaInstallButton);
  generatedFiles.push("src/components/PWAInstallButton.tsx");
}

function generateCrossTabSync(): void {
  const outputDir = join(projectRoot, "src", "utils");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const crossTabSync = language === "ts"
    ? `export class CrossTabSync {
  private channel: BroadcastChannel;
  private listeners: Map<string, Set<(value: unknown, type: string) => void>>;

  constructor(channelName = 'swoff-sync') {
    this.channel = new BroadcastChannel(channelName);
    this.listeners = new Map();

    this.channel.onmessage = (event: MessageEvent) => {
      const { key, value, type } = event.data;
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.forEach((callback) => callback(value, type));
      }
    };
  }

  subscribe(
    key: string,
    callback: (value: unknown, type: string) => void
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(\`swoff-sync-\${key}\`, JSON.stringify(value));
    } catch {
      // ignore
    }
    this.channel.postMessage({ type: 'set', key, value });
  }

  get(key: string): unknown {
    try {
      const stored = localStorage.getItem(\`swoff-sync-\${key}\`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  delete(key: string): void {
    localStorage.removeItem(\`swoff-sync-\${key}\`);
    this.channel.postMessage({ type: 'delete', key, value: null });
  }

  close(): void {
    this.channel.close();
    this.listeners.clear();
  }
}

export function createCrossTabSync(channelName = 'swoff-sync'): CrossTabSync {
  return new CrossTabSync(channelName);
}
`
    : `export class CrossTabSync {
  constructor(channelName = 'swoff-sync') {
    this.channel = new BroadcastChannel(channelName);
    this.listeners = new Map();

    this.channel.onmessage = (event) => {
      const { key, value, type } = event.data;
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.forEach((callback) => callback(value, type));
      }
    };
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  set(key, value) {
    try {
      localStorage.setItem(\`swoff-sync-\${key}\`, JSON.stringify(value));
    } catch {
      // ignore
    }
    this.channel.postMessage({ type: 'set', key, value });
  }

  get(key) {
    try {
      const stored = localStorage.getItem(\`swoff-sync-\${key}\`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  delete(key) {
    localStorage.removeItem(\`swoff-sync-\${key}\`);
    this.channel.postMessage({ type: 'delete', key, value: null });
  }

  close() {
    this.channel.close();
    this.listeners.clear();
  }
}

export function createCrossTabSync(channelName = 'swoff-sync') {
  return new CrossTabSync(channelName);
}
`;

  writeFileSync(join(outputDir, `crossTabSync.${ext}`), crossTabSync);
  generatedFiles.push(`src/utils/crossTabSync.${ext}`);
}

function generateManifest(): void {
  const outputDir = join(projectRoot, "public");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const manifest = {
    name: 'Swoff App',
    short_name: 'Swoff',
    description: 'Offline-first web application',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };

  writeFileSync(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  generatedFiles.push("public/manifest.json");
}

console.log('🔧 Swoff Files Generator');
console.log('========================\n');

console.log(`Language: ${language}`);
console.log(`Project: ${projectRoot}`);
console.log('');

if (!config.enabled) {
  console.log('⚠️  Config generation disabled');
  process.exit(0);
}

console.log('📦 Generating pattern files...');

generateSwInjector();
console.log('  • sw-injector');

generateSwGeneratorBuildScript();
console.log('  • sw-generator build script');

generateSwTemplate();
console.log('  • sw-template.js');

generateTypeDefinitions();
console.log('  • swoff.d.ts');

if (config.features.offlineReads) {
  generateOfflineHooks();
  console.log('  • offline hooks (useOffline, useApiData)');
}

if (config.features.mutationQueue) {
  generateMutationQueueHooks();
  console.log('  • mutation queue hook (useMutationQueue)');
}

if (config.features.pwa) {
  generatePWAComponents();
  console.log('  • PWA components (OfflineIndicator, PWAInstallButton)');
  generateManifest();
  console.log('  • manifest.json');
}

if (config.features.crossTabSync) {
  generateCrossTabSync();
  console.log('  • cross-tab sync (crossTabSync)');
}

console.log('\n✅ Generated files:');
generatedFiles.forEach((file) => console.log(`   • ${file}`));
console.log("\n✨ Total: " + generatedFiles.length + " files generated");