/**
 * Swoff Incremental File Generator
 * 
 * This script generates specific files based on your swoff.config.json configuration.
 * It enables incremental adoption of Swoff features.
 * 
 * Usage:
 *   node examples/shared/swoff-files-generator.js
 * 
 * This will read your swoff.config.json and generate the appropriate files
 * based on which features are enabled.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load configuration
const loadConfig = () => {
  const possibleFiles = [
    "swoff.config.json",
    "swoff.config.js"
  ];
  
  for (const file of possibleFiles) {
    const configPath = join(__dirname, "..", "..", file);
    if (existsSync(configPath)) {
      if (file.endsWith('.json')) {
        return JSON.parse(readFileSync(configPath, "utf8"));
      }
    }
  }
  
  return null;
};

// Default configuration
const defaultConfig = {
  enabled: true,
  version: "from-package",
  minSupportedVersion: "0.0.0",
  serviceWorker: {
    autoUpdate: false,
    defaultStrategy: "cache-first",
    maxCacheEntries: 100,
    maxCacheAge: 7 * 24 * 60 * 60 * 1000,
    runtimeCacheName: "swoff-runtime"
  },
  features: {
    versionedSw: true,
    offlineReads: true,
    mutationQueue: false,
    backgroundSync: false,
    pwa: true,
    auth: false,
    crossTabSync: true,
    tagInvalidation: true
  },
  database: {
    name: "app-db",
    stores: []
  },
  build: {
    outputDir: "dist",
    swFilename: "sw"
  }
};

const config = loadConfig() || defaultConfig;

if (!config.enabled) {
  console.log("⚠️  Config generation disabled. Set enabled: true to use this feature.");
  process.exit(0);
}

console.log("🔧 Swoff Incremental File Generator");
console.log("====================================\n");

// Generate based on features
const generatedFiles = [];

if (config.features.offlineReads) {
  console.log("📦 Generating offline data hooks...");
  generatedFiles.push(...generateOfflineHooks(config));
}

if (config.features.mutationQueue) {
  console.log("📦 Generating mutation queue hooks...");
  generatedFiles.push(...generateMutationQueueHooks(config));
}

if (config.features.pwa) {
  console.log("📦 Generating PWA components...");
  generatedFiles.push(...generatePWAComponents(config));
}

if (config.features.crossTabSync) {
  console.log("📦 Generating cross-tab sync utilities...");
  generatedFiles.push(...generateCrossTabSync(config));
}

console.log("\n✅ Generated files:");
generatedFiles.forEach(file => console.log(`   • ${file.path}`));
console.log(`\n✨ Total: ${generatedFiles.length} files generated`);

// ========================================
// GENERATORS
// ========================================

function generateOfflineHooks(config) {
  const files = [];
  const outputDir = join(__dirname, "..", "..", "src", "hooks");
  
  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate useOffline hook
  const useOfflineCode = `import { useState, useEffect } from 'react';

/**
 * useOffline hook
 * 
 * Detects online/offline status and provides callback handlers.
 * Useful for showing UI indicators when the user goes offline.
 * 
 * @example
 * const { isOnline, isOffline } = useOffline();
 * 
 * return isOffline ? <OfflineMessage /> : null;
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

  return { 
    isOnline, 
    isOffline: !isOnline 
  };
};

/**
 * useOfflineCallback hook
 * 
 * Provides callbacks that can be used when going offline/online.
 * 
 * @example
 * const { onOnline, onOffline } = useOfflineCallback({
 *   onOnline: () => console.log('Back online!'),
 *   onOffline: () => console.log('Gone offline')
 * });
 */
export const useOfflineCallback = (callbacks = {}) => {
  const { onOnline, onOffline } = callbacks;
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onOnline?.();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  return { isOnline, isOffline: !isOnline };
};
`;

  writeFileSync(join(outputDir, "useOffline.ts"), useOfflineCode);
  files.push({ path: "src/hooks/useOffline.ts" });
  
  // Generate useApiData hook
  const useApiDataCode = `import { useState, useEffect, useCallback } from 'react';

/**
 * useApiData hook
 * 
 * Fetches and caches API data for offline access.
 * Returns cached data when offline.
 * 
 * @param endpoint - API endpoint to fetch
 * @param options - Fetch options
 * @example
 * const { data, loading, error, refetch } = useApiData('/api/posts');
 */
export const useApiData = (endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (fetchOptions = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(endpoint, {
        ...options,
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          ...fetchOptions.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // If offline and we have cached data, return it
      if (!navigator.onLine && data) {
        console.log('Using cached data while offline');
        return data;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options, data]);

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData 
  };
};

/**
 * useCachedApiData hook
 * 
 * Provides manual control over caching with explicit cache operations.
 * 
 * @param endpoint - API endpoint
 * @param cacheKey - Unique key for caching
 * @example
 * const { data, setCache, clearCache } = useCachedApiData('/api/user', 'user-data');
 */
export const useCachedApiData = (endpoint, cacheKey) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cacheData = useCallback((dataToCache) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      setData(dataToCache);
    } catch (err) {
      console.error('Failed to cache data:', err);
    }
  }, [cacheKey]);

  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.error('Failed to get cached data:', err);
      return null;
    }
  }, [cacheKey]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey);
      setData(null);
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  }, [cacheKey]);

  const fetchData = useCallback(async (fetchOptions = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Try network first
      const response = await fetch(endpoint, fetchOptions);
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const result = await response.json();
      
      // Cache the result
      cacheData(result);
      
      return result;
    } catch (err) {
      // On error, try to get cached data
      const cached = getCachedData();
      
      if (cached) {
        setData(cached);
        console.log('Using cached data due to network error');
        return cached;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, cacheData, getCachedData]);

  // Load cached data on mount
  useEffect(() => {
    const cached = getCachedData();
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [endpoint]);

  return { 
    data, 
    loading, 
    error, 
    setCache: cacheData, 
    getCached: getCachedData,
    clearCache,
    refetch: fetchData 
  };
};
`;

  writeFileSync(join(outputDir, "useApiData.ts"), useApiDataCode);
  files.push({ path: "src/hooks/useApiData.ts" });
  
  return files;
}

function generateMutationQueueHooks(config) {
  const files = [];
  const outputDir = join(__dirname, "..", "..", "src", "hooks");
  
  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate useMutationQueue hook
  const useMutationQueueCode = `import { useState, useEffect, useCallback } from 'react';

/**
 * useMutationQueue hook
 * 
 * Queues mutations when offline and syncs when back online.
 * Uses localStorage for persistence across page reloads.
 * 
 * @example
 * const { queueMutation, pendingMutations, isSyncing } = useMutationQueue({
 *   onSync: async (mutation) => {
 *     await fetch('/api/posts', {
 *       method: 'POST',
 *       body: JSON.stringify(mutation.data)
 *     });
 *   }
 * });
 * 
 * // Queue a mutation
 * await queueMutation({ type: 'CREATE_POST', data: { title: 'Hello' } });
 */
export const useMutationQueue = (options = {}) => {
  const { onSync, maxRetries = 3, storageKey = 'swoff-mutation-queue' } = options;
  
  const [pendingMutations, setPendingMutations] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPendingMutations(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load mutation queue:', err);
    }
  }, [storageKey]);

  // Save queue to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pendingMutations));
    } catch (err) {
      console.error('Failed to save mutation queue:', err);
    }
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
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      await syncMutations();
    }
    
    return newMutation.id;
  }, [onSync]);

  const removeMutation = useCallback((mutationId) => {
    setPendingMutations(prev => prev.filter(m => m.id !== mutationId));
  }, []);

  const updateMutationStatus = useCallback((mutationId, status) => {
    setPendingMutations(prev => 
      prev.map(m => m.id === mutationId ? { ...m, status } : m)
    );
  }, []);

  const syncMutations = useCallback(async () => {
    if (isSyncing || !navigator.onLine || pendingMutations.length === 0) {
      return;
    }

    setIsSyncing(true);
    
    const mutationsToProcess = pendingMutations.filter(m => m.status === 'pending');
    
    for (const mutation of mutationsToProcess) {
      try {
        updateMutationStatus(mutation.id, 'syncing');
        
        await onSync(mutation);
        
        updateMutationStatus(mutation.id, 'synced');
        removeMutation(mutation.id);
      } catch (err) {
        console.error('Failed to sync mutation:', mutation.id, err);
        
        const mutation = pendingMutations.find(m => m.id === mutation.id);
        if (mutation && mutation.retries < maxRetries) {
          updateMutationStatus(mutation.id, 'pending');
          setPendingMutations(prev =>
            prev.map(m => m.id === mutation.id 
              ? { ...m, retries: m.retries + 1 } 
              : m
            )
          );
        } else {
          updateMutationStatus(mutation.id, 'failed');
        }
      }
    }
    
    setLastSyncTime(Date.now());
    setIsSyncing(false);
  }, [isSyncing, onSync, pendingMutations, maxRetries, updateMutationStatus, removeMutation]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online, syncing mutations...');
      syncMutations();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncMutations]);

  const clearQueue = useCallback(() => {
    setPendingMutations([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const retryFailed = useCallback(() => {
    setPendingMutations(prev =>
      prev.map(m => m.status === 'failed' 
        ? { ...m, status: 'pending', retries: 0 } 
        : m
      )
    );
    syncMutations();
  }, [syncMutations]);

  return {
    queueMutation,
    pendingMutations,
    isSyncing,
    lastSyncTime,
    syncMutations,
    clearQueue,
    retryFailed,
    hasPending: pendingMutations.some(m => m.status === 'pending'),
    hasFailed: pendingMutations.some(m => m.status === 'failed')
  };
};

/**
 * useOptimisticUpdate hook
 * 
 * Provides optimistic updates with automatic rollback on failure.
 * 
 * @example
 * const { update, isUpdating } = useOptimisticUpdate({
 *   onUpdate: async (data) => fetch('/api/posts/1', { method: 'PUT', body: JSON.stringify(data) }),
 *   onRollback: () => fetch('/api/posts/1')
 * });
 * 
 * await update({ title: 'New Title' });
 */
export const useOptimisticUpdate = (options = {}) => {
  const { onUpdate, onRollback } = options;
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback(async (newData, previousData) => {
    if (!onUpdate) {
      throw new Error('onUpdate callback is required');
    }

    setIsUpdating(true);
    setError(null);

    try {
      await onUpdate(newData);
    } catch (err) {
      // Rollback on error
      if (onRollback && previousData) {
        try {
          await onRollback(previousData);
        } catch (rollbackErr) {
          console.error('Failed to rollback:', rollbackErr);
        }
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [onUpdate, onRollback]);

  return { update, isUpdating, error };
};
`;

  writeFileSync(join(outputDir, "useMutationQueue.ts"), useMutationQueueCode);
  files.push({ path: "src/hooks/useMutationQueue.ts" });
  
  return files;
}

function generatePWAComponents(config) {
  const files = [];
  const outputDir = join(__dirname, "..", "..", "src", "components");
  
  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate OfflineIndicator component
  const offlineIndicatorCode = `import { useOffline } from '../hooks/useOffline';

/**
 * OfflineIndicator component
 * 
 * Shows a banner when the user is offline.
 * Use this component to provide visual feedback about network status.
 * 
 * @example
 * <OfflineIndicator />
 * 
 * // Custom position
 * <OfflineIndicator position="top" />
 * 
 * // Custom message
 * <OfflineIndicator message="No internet connection" />
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
      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

/**
 * OfflineBanner component
 * 
 * A larger banner that spans the width of the screen.
 * 
 * @example
 * <OfflineBanner />
 */
export const OfflineBanner = ({ 
  message = 'You are currently offline. Some features may be limited.',
  className = ''
}) => {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div 
      className={\`fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 z-50 flex items-center justify-center gap-2 \${className}\`}
      role="alert"
      aria-live="polite"
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
  
  // Generate PWAInstallButton component
  const pwaInstallCode = `import { useState, useEffect } from 'react';

/**
 * PWAInstallButton component
 * 
 * Shows an install button when the PWA is installable.
 * Uses the beforeinstallprompt event to detect installability.
 * 
 * @example
 * <PWAInstallButton />
 * 
 * // Custom labels
 * <PWAInstallButton 
 *   installLabel="Install App" 
 *   installedLabel="Installed"
 * />
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

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  if (!isInstallable && !isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalled}
      className={\`fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 disabled:bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors z-50 \${className}\`}
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

function generateCrossTabSync(config) {
  const files = [];
  const outputDir = join(__dirname, "..", "..", "src", "utils");
  
  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate cross-tab sync utility
  const crossTabSyncCode = `/**
 * Cross-Tab Synchronization Utilities
 * 
 * Provides utilities for synchronizing state across browser tabs.
 * Uses BroadcastChannel API and localStorage events.
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

  /**
   * Subscribe to changes for a specific key
   * 
   * @param key - The key to subscribe to
   * @param callback - Function to call when value changes
   * @returns Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    return () => {
      const callbacks = this.listeners.get(key);
      callbacks?.delete(callback);
    };
  }

  /**
   * Set a value and notify all tabs
   * 
   * @param key - The key to set
   * @param value - The value to set
   */
  set(key, value) {
    // Store in localStorage for persistence
    try {
      localStorage.setItem(\`swoff-sync-\${key}\`, JSON.stringify(value));
    } catch (err) {
      console.warn('Failed to store in localStorage:', err);
    }
    
    // Notify other tabs
    this.channel.postMessage({ type: 'set', key, value });
  }

  /**
   * Get a value from localStorage
   * 
   * @param key - The key to get
   * @returns The stored value or null
   */
  get(key) {
    try {
      const stored = localStorage.getItem(\`swoff-sync-\${key}\`);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.warn('Failed to get from localStorage:', err);
      return null;
    }
  }

  /**
   * Remove a value
   * 
   * @param key - The key to remove
   */
  remove(key) {
    try {
      localStorage.removeItem(\`swoff-sync-\${key}\`);
    } catch (err) {
      console.warn('Failed to remove from localStorage:', err);
    }
    
    this.channel.postMessage({ type: 'remove', key });
  }

  /**
   * Close the channel
   */
  close() {
    this.channel.close();
    this.listeners.clear();
  }
}

/**
 * Create a cross-tab sync instance
 */
export const createCrossTabSync = (channelName) => {
  return new CrossTabSync(channelName);
};

/**
 * Cache invalidation utility
 * 
 * @example
 * import { invalidateCache } from '../utils/crossTabSync';
 * 
 * // Invalidate a specific cache key
 * await invalidateCache('user-data');
 * 
 * // Invalidate all caches
 * await invalidateCache();
 */
export const invalidateCache = async (key = null) => {
  const sync = new CrossTabSync('swoff-cache');
  
  if (key) {
    sync.set(\`invalidate-\${key}\`, Date.now());
  } else {
    sync.set('invalidate-all', Date.now());
  }
  
  sync.close();
};

/**
 * Subscribe to cache invalidation events
 * 
 * @param key - Specific cache key to watch (or null for all)
 * @param callback - Function to call when cache is invalidated
 */
export const watchCacheInvalidation = (key, callback) => {
  const sync = new CrossTabSync('swoff-cache');
  
  if (key) {
    return sync.subscribe(\`invalidate-\${key}\`, (value) => callback(value));
  } else {
    return sync.subscribe('invalidate-all', (value) => callback(value));
  }
};

export default CrossTabSync;
`;

  writeFileSync(join(outputDir, "crossTabSync.ts"), crossTabSyncCode);
  files.push({ path: "src/utils/crossTabSync.ts" });
  
  return files;
}

console.log("\n📝 Note: Generated files are located in src/hooks, src/components, and src/utils");
console.log("   You may need to adjust imports based on your project structure.");