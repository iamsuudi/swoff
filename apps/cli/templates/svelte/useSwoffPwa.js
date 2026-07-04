import { writable } from "svelte/store";
import { onMount } from "svelte";
import { promptInstall } from "../pwa/prompt.js";

export function useSwoffPwa() {
  const canInstall = writable(false);

  function onReady() { canInstall.set(true); }
  function onDone() { canInstall.set(false); }

  onMount(() => {
    window.addEventListener("pwa-installable", onReady);
    window.addEventListener("pwa-installed", onDone);
    window.addEventListener("pwa-dismissed", onDone);
    return () => {
      window.removeEventListener("pwa-installable", onReady);
      window.removeEventListener("pwa-installed", onDone);
      window.removeEventListener("pwa-dismissed", onDone);
    };
  });

  async function install() {
    await promptInstall();
  }

  return { canInstall, install };
}
