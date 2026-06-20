"use client";

import { useEffect } from "react";
import { initServiceWorker } from "@/swoff/client-injector";
import { checkStorage } from "@/swoff/storage-notify";
import SWUpdatePrompt from "@/components/SWUpdatePrompt";
import LoadingSpinner from "@/components/LoadingSpinner";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";

export default function ClientShell({
  children,
}: {
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const listener = (event: Event) => {
      const { level, code, message } = (event as CustomEvent).detail;
      console.log(`[swoff:${level}] ${code}: ${message}`);
    };
    window.addEventListener("swoff:notification", listener);

    initServiceWorker().then(() => {
      checkStorage();
    });

    return () => window.removeEventListener("swoff:notification", listener);
  }, []);

  return (
    <>
      <LoadingSpinner />
      <SWUpdatePrompt />
      <NetworkStatusBanner />
      {children}
    </>
  );
}
