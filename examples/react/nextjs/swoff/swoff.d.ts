interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
    latestSWVersion?: string;
    currentSWVersion?: string;
    swRegisteredVersion?: string;
    swAvailableVersion?: string;
    swUpdateRequired?: boolean;
    swMinSupportedVersion?: string;
    swReady?: boolean;
    swError?: boolean;
  }
}
export {};
