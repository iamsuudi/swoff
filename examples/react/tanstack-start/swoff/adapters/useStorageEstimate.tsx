import { useState, useEffect } from "react";
import { getStorageEstimate, formatBytes } from "../storage-notify";

interface StorageEstimateState {
  usage: number;
  quota: number;
  percentUsed: number;
  formattedUsage: string;
  formattedQuota: string;
  loading: boolean;
  error: string | null;
}

/**
 * Reactive storage estimate. Shows available quota and usage.
 *
 * Usage:
 *   const { usage, quota, percentUsed, formattedUsage, formattedQuota, loading } = useStorageEstimate();
 *
 *   if (!loading && percentUsed > 80) return <StorageWarning />;
 *
 * @param autoRefresh - Re-check on visibility change (default true)
 * @returns {{ usage: number, quota: number, percentUsed: number, formattedUsage: string, formattedQuota: string, loading: boolean, error: string | null }}
 */
export function useStorageEstimate(autoRefresh = true): StorageEstimateState {
  const [state, setState] = useState<StorageEstimateState>({
    usage: 0,
    quota: 0,
    percentUsed: 0,
    formattedUsage: "0 B",
    formattedQuota: "0 B",
    loading: true,
    error: null,
  });

  const check = async () => {
    try {
      const { usage, quota, percentUsed } = await getStorageEstimate();
      setState({
        usage,
        quota,
        percentUsed,
        formattedUsage: formatBytes(usage),
        formattedQuota: formatBytes(quota),
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: String(err) }));
    }
  };

  useEffect(() => {
    check();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [autoRefresh]);

  return state;
}
