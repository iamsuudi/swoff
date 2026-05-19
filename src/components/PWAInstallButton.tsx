import { useState, useEffect } from 'react';

/**
 * PWAInstallButton component
 * 
 * Shows an install button when the PWA is installable.
 * Uses the beforeinstallprompt event to detect installability.
 * 
 * @example
 * <PWAInstallButton />
 * 
 * // Custom labels
 * <PWAInstallButton 
 *   installLabel="Install App" 
 *   installedLabel="Installed"
 * />
 */
export const PWAInstallButton = ({ 
  installLabel = 'Install App',
  installedLabel = 'Installed',
  className = ''
}) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  if (!isInstallable && !isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalled}
      className={`fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 disabled:bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors z-50 ${className}`}
    >
      {isInstalled ? installedLabel : installLabel}
    </button>
  );
};

export default PWAInstallButton;
