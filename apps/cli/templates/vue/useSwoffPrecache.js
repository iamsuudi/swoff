import { ref, onMounted, onUnmounted } from "vue";

export function useSwoffPrecache() {
  const progress = ref(0);

  function onProgress(e) {
    progress.value = e.detail.percent;
  }

  onMounted(() => {
    window.addEventListener("sw-progress", onProgress);
  });

  onUnmounted(() => {
    window.removeEventListener("sw-progress", onProgress);
  });

  return { progress };
}
