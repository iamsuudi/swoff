import { ref, onMounted, onUnmounted } from "vue";
import { promptInstall } from "../pwa/prompt";

export function useSwoffPwa() {
  const canInstall = ref(false);

  function onReady() { canInstall.value = true; }
  function onDone() { canInstall.value = false; }

  onMounted(() => {
    window.addEventListener("pwa-installable", onReady);
    window.addEventListener("pwa-installed", onDone);
    window.addEventListener("pwa-dismissed", onDone);
  });

  onUnmounted(() => {
    window.removeEventListener("pwa-installable", onReady);
    window.removeEventListener("pwa-installed", onDone);
    window.removeEventListener("pwa-dismissed", onDone);
  });

  async function install() {
    await promptInstall();
  }

  return { canInstall, install };
}
