/**
 * Swoff Incremental File Generator
 * 
 * Generates hooks, components, and utilities based on config features.
 * 
 * CLI Usage:
 *   node swoff-files-generator.js --project-root <path> --package-dir <path>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

// Parse CLI arguments
const args = process.argv.slice(2);
const projectRootArg = args.findIndex(arg => arg === '--project-root');
const packageDirArg = args.findIndex(arg => arg === '--package-dir');

const passedProjectRoot = projectRootArg !== -1 ? args[projectRootArg + 1] : null;
const passedPackageDir = packageDirArg !== -1 ? args[packageDirArg + 1] : null;

const projectRoot = passedProjectRoot || process.cwd();
const packageDir = passedPackageDir || join(dirname(fileURLToPath(import.meta.url)), '../..');

// Load configuration
function loadConfig() {
  const configPath = join(projectRoot, "swoff.config.json");
  
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, "utf8"));
    } catch (e) {
      return null;
    }
  }
  return null;
}

const config = loadConfig() || {
  enabled: true,
  features: {
    offlineReads: true,
    mutationQueue: false,
    pwa: true,
    crossTabSync: true
  }
};

if (!config.enabled) {
  console.log("⚠️  Config generation disabled.");
  process.exit(0);
}

console.log("🔧 Swoff Incremental File Generator");
console.log("====================================\n");

const generatedFiles = [];

if (config.features.offlineReads) {
  console.log("📦 Generating offline data hooks...");
  generatedFiles.push(...generateOfflineHooks());
}

if (config.features.mutationQueue) {
  console.log("📦 Generating mutation queue hooks...");
  generatedFiles.push(...generateMutationQueueHooks());
}

if (config.features.pwa) {
  console.log("📦 Generating PWA components...");
  generatedFiles.push(...generatePWAComponents());
}

if (config.features.crossTabSync) {
  console.log("📦 Generating cross-tab sync utilities...");
  generatedFiles.push(...generateCrossTabSync());
}

console.log("\n✅ Generated files:");
generatedFiles.forEach(file => console.log(`   • ${file.path}`));
console.log(`\n✨ Total: ${generatedFiles.length} files generated`);

function generateOfflineHooks() {
  const files = [];
  const outputDir = join(projectRoot, "src", "hooks");
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const useOfflineCode = `import { useState, useEffect } from 'react';

/**
 * useOffline hook
 * Detects online/offline status and provides callback handlers.
 * 
 * @example
 * const { isOnline, isOffline } = useOffline();
 */
export const useOffline = () => {
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
};

export default useOffline;
`;

  writeFileSync(join(outputDir, "useOffline.ts"), useOfflineCode);
  files.push({ path: "src/hooks/useOffline.ts" });
  
  const useApiDataCode = `import { useState, useEffect, useCallback } from 'react';

/**
 * useApiData hook
 * Fetches and caches API data for offline access.
 * 
 * @param endpoint - API endpoint to fetch
 * @param options - Fetch options
 */
export const useApiData = (endpoint, options = {}) => {
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
      setError(errorMessage);
      
      if (!navigator.onLine && data) {
        return data;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options, data]);

  useEffect(() => { fetchData(); }, [endpoint]);

  return { data, loading, error, refetch: fetchData };
};

export default useApiData;
`;

  writeFileSync(join(outputDir, "useApiData.ts"), useApiDataCode);
  files.push({ path: "src/hooks/useApiData.ts" });
  
  return files;
}

function generateMutationQueueHooks() {
  const files = [];
  const outputDir = join(projectRoot, "src", "hooks");
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const useMutationQueueCode = `import { useState, useEffect, useCallback } from 'react';

/**
 * useMutationQueue hook
 * Queues mutations when offline and syncs when back online.
 */
export const useMutationQueue = (options = {}) => {
  const { onSync, maxRetries = 3, storageKey = 'swoff-mutation-queue' } = options;
  
  const [pendingMutations, setPendingMutations] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setPendingMutations(JSON.parse(stored));
    } catch (err) {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pendingMutations));
    } catch (err) {}
  }, [pendingMutations, storageKey]);

  const queueMutation = useCallback(async (mutation) => {
    const newMutation = {
      id: \`\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      ...mutation
    };

    setPendingMutations(prev => [...prev, newMutation]);
    
    if (navigator.onLine) {
      await syncMutations();
    }
    
    return newMutation.id;
  }, [onSync]);

  const syncMutations = useCallback(async () => {
    if (isSyncing || !navigator.onLine || pendingMutations.length === 0) return;

    setIsSyncing(true);
    
    for (const mutation of pendingMutations.filter(m => m.status === 'pending')) {
      try {
        await onSync(mutation);
        setPendingMutations(prev => prev.filter(m => m.id !== mutation.id));
      } catch (err) {
        setPendingMutations(prev =>
          prev.map(m => m.id === mutation.id 
            ? { ...m, retries: m.retries + 1 } 
            : m
          )
        );
      }
    }
    
    setIsSyncing(false);
  }, [isSyncing, onSync, pendingMutations]);

  useEffect(() => {
    const handleOnline = () => syncMutations();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncMutations]);

  const clearQueue = useCallback(() => {
    setPendingMutations([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { queueMutation, pendingMutations, isSyncing, syncMutations, clearQueue };
};

export default useMutationQueue;
`;

  writeFileSync(join(outputDir, "useMutationQueue.ts"), useMutationQueueCode);
  files.push({ path: "src/hooks/useMutationQueue.ts" });
  
  return files;
}

function generatePWAComponents() {
  const files = [];
  const outputDir = join(projectRoot, "src", "components");
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const offlineIndicatorCode = `import { useOffline } from '../hooks/useOffline';

/**
 * OfflineIndicator component
 * Shows a banner when the user is offline.
 */
export const OfflineIndicator = ({ 
  position = 'bottom-right',
  message = 'You are offline. Some features may be limited.',
  className = ''
}) => {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

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
};

export default OfflineIndicator;
`;

  writeFileSync(join(outputDir, "OfflineIndicator.tsx"), offlineIndicatorCode);
  files.push({ path: "src/components/OfflineIndicator.tsx" });
  
  const pwaInstallCode = `import { useState, useEffect } from 'react';

/**
 * PWAInstallButton component
 * Shows an install button when the PWA is installable.
 */
export const PWAInstallButton = ({ 
  installLabel = 'Install App',
  installedLabel = 'Installed',
  className = ''
}) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
    if (outcome === 'accepted') setIsInstalled(true);
    setIsInstallable(false);
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
};

export default PWAInstallButton;
`;

  writeFileSync(join(outputDir, "PWAInstallButton.tsx"), pwaInstallCode);
  files.push({ path: "src/components/PWAInstallButton.tsx" });
  
  return files;
}

function generateCrossTabSync() {
  const files = [];
  const outputDir = join(projectRoot, "src", "utils");
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const crossTabSyncCode = `/**
 * Cross-Tab Synchronization Utilities
 * Provides utilities for synchronizing state across browser tabs.
 */

export class CrossTabSync {
  constructor(channelName = 'swoff-sync') {
    this.channel = new BroadcastChannel(channelName);
    this.listeners = new Map();
    
    this.channel.onmessage = (event) => {
      const { type, key, value } = event.data;
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback(value, type));
      }
    };
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key)?.delete(callback);
  }

  set(key, value) {
    try {
      localStorage.setItem(\`swoff-sync-\${key}\`, JSON.stringify(value));
    } catch (err) {}
    this.channel.postMessage({ type: 'set', key, value });
  }

  get(key) {
    try {
      const stored = localStorage.getItem(\`swoff-sync-\${key}\`);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      return null;
    }
  }

  close() {
    this.channel.close();
    this.listeners.clear();
  }
}

export const createCrossTabSync = (channelName) => new CrossTabSync(channelName);

export default CrossTabSync;
`;

  writeFileSync(join(outputDir, "crossTabSync.ts"), crossTabSyncCode);
  files.push({ path: "src/utils/crossTabSync.ts" });
  
  return files;
}

console.log("\n📝 Note: Generated files are located in src/hooks, src/components, and src/utils");