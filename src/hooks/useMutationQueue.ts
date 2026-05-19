import { useState, useEffect, useCallback } from 'react';

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
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
