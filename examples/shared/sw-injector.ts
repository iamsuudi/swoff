export async function checkForUpdate(): Promise<{
  version: string;
  minSupportedVersion?: string;
} | null> {
  try {
    const response = await fetch("/version.json?t=" + Date.now());
    const manifest = await response.json();
    return manifest;
  } catch {
    return null;
  }
}

export async function registerServiceWorker(version: string) {
  const swUrl = `/sw-v${version}.js`;
  const registration = await navigator.serviceWorker.register(swUrl);
  localStorage.setItem("swRegisteredVersion", version);
  window.currentSWVersion = version;
  window.swRegisteredVersion = version;
  window.dispatchEvent(new CustomEvent("sw-version-detected"));
  window.dispatchEvent(new CustomEvent("sw-ready"));
  return registration;
}

function shouldRegisterSW(): boolean {
  const dismissed = sessionStorage.getItem("sw-dismissed-update") === "true";
  if (dismissed) return false;
  return true;
}

export async function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!shouldRegisterSW()) return;

  const manifest = await checkForUpdate();
  if (!manifest) return;

  const currentVersion = localStorage.getItem("swRegisteredVersion");
  window.latestSWVersion = manifest.version;
  window.swMinSupportedVersion = manifest.minSupportedVersion || "0.0.0";

  if (currentVersion === manifest.version) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      window.currentSWVersion = currentVersion;
      window.dispatchEvent(new CustomEvent("sw-version-detected"));
      window.dispatchEvent(new CustomEvent("sw-ready"));
    }
  } else if (currentVersion && currentVersion !== manifest.version) {
    window.swAvailableVersion = manifest.version;
    window.swUpdateRequired =
      currentVersion < (manifest.minSupportedVersion || "0.0.0");
    window.dispatchEvent(
      new CustomEvent("sw-update-available", {
        detail: { version: manifest.version },
      }),
    );
  } else {
    await registerServiceWorker(manifest.version);
  }
}
