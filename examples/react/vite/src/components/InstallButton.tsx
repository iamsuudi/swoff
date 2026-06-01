import { useState, useEffect } from "react";
import { isInstallable, promptInstall } from "../../swoff/pwa/install";

export default function InstallButton() {
  const [installable, setInstallable] = useState(() => isInstallable());

  useEffect(() => {
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => setInstallable(false);
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  if (!installable) return null;

  const handleInstall = async () => {
    await promptInstall();
  };

  return (
    <button onClick={handleInstall}
      className="rounded-lg border border-teal-500 px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30">
      Install App
    </button>
  );
}
