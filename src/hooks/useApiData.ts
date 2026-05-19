import { useState, useEffect, useCallback } from 'react';

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
        throw new Error(`HTTP error! status: ${response.status}`);
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
        throw new Error(`HTTP error! status: ${response.status}`);
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
