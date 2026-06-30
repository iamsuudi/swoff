import { useState, useEffect } from "react";

export function usePrecacheProgress() {
  const [state, setState] = useState(() => ({
    status: "idle" as "idle" | "installing",
    progress: 0,
  }));

  useEffect(() => {
    const onProgress = (e: WindowEventMap["sw-progress"]) =>
      setState({ status: "installing", progress: e.detail.percent });

    window.addEventListener("sw-progress", onProgress);
    return () => {
      window.removeEventListener("sw-progress", onProgress);
    };
  }, []);

  return state;
}
