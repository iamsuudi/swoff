import { useState, useEffect, useCallback } from "react";
import { isInstallable, promptInstall } from "../pwa/prompt.ts";

export function useSwoffPwa() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const onReady = () => setCanInstall(true);
    const onDone = () => setCanInstall(false);

    window.addEventListener("pwa-installable", onReady);
    window.addEventListener("pwa-installed", onDone);
    window.addEventListener("pwa-dismissed", onDone);
    return () => {
      window.removeEventListener("pwa-installable", onReady);
      window.removeEventListener("pwa-installed", onDone);
      window.removeEventListener("pwa-dismissed", onDone);
    };
  }, []);

  const install = useCallback(async () => {
    await promptInstall();
  }, []);

  return { canInstall, install };
}
