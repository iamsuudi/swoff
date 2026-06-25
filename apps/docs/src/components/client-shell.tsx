import { useEffect } from "react";
import { initServiceWorker } from "../../swoff/client-injector";
import SWUpdatePrompt from "./SWUpdatePrompt";

export default function ClientShell() {
  useEffect(() => {
    const listener = (event: Event) => {
      const { level, code, message } = (event as CustomEvent).detail;
      console.log(`[swoff:${level}] ${code}: ${message}`);
    };
    window.addEventListener("swoff:notification", listener);

    initServiceWorker();

    return () => window.removeEventListener("swoff:notification", listener);
  }, []);

  return <SWUpdatePrompt />;
}
