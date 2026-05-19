import { useState, useEffect } from 'react';

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
