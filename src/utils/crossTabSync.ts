/**
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
      localStorage.setItem(`swoff-sync-${key}`, JSON.stringify(value));
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
      const stored = localStorage.getItem(`swoff-sync-${key}`);
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
      localStorage.removeItem(`swoff-sync-${key}`);
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
    sync.set(`invalidate-${key}`, Date.now());
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
    return sync.subscribe(`invalidate-${key}`, (value) => callback(value));
  } else {
    return sync.subscribe('invalidate-all', (value) => callback(value));
  }
};

export default CrossTabSync;
