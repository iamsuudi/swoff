import { useState, useEffect } from "react";

export function useSwoffPrecache() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onProgress = (e) =>
      setProgress(e.detail.percent);

    window.addEventListener("sw-progress", onProgress);
    return () => {
      window.removeEventListener("sw-progress", onProgress);
    };
  }, []);

  return { progress };
}
