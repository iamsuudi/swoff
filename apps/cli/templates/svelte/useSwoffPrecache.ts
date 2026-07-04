import { writable } from "svelte/store";
import { onMount } from "svelte";

export function useSwoffPrecache() {
  const progress = writable(0);

  function onProgress(e: WindowEventMap["sw-progress"]) {
    progress.set(e.detail.percent);
  }

  onMount(() => {
    window.addEventListener("sw-progress", onProgress);
    return () => {
      window.removeEventListener("sw-progress", onProgress);
    };
  });

  return { progress };
}
