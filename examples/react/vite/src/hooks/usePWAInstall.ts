import { useState, useEffect, useCallback } from "react";

export function usePWAInstall() {
  const [installable, setInstallable] = useState(!!window.deferredInstallPrompt);

  useEffect(() => {
    const handler = () => setInstallable(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("pwa-prompt-captured", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa-prompt-captured", handler);
    };
  }, []);

  const showInstallPrompt = useCallback(async () => {
    const promptEvent = window.deferredInstallPrompt;
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    window.deferredInstallPrompt = null;
    setInstallable(false);
    return outcome;
  }, []);

  return { installable, showInstallPrompt };
}
