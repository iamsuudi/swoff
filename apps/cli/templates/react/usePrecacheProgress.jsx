import { useState, useEffect } from "react";

export function usePrecacheProgress() {
  const [state, setState] = useState(() => ({
    status: "idle",
    progress: 0,
  }));

  useEffect(() => {
    const onProgress = (e) =>
      setState({ status: "installing", progress: e.detail.percent });

    window.addEventListener("sw-progress", onProgress);
    return () => {
      window.removeEventListener("sw-progress", onProgress);
    };
  }, []);

  return state;
}
