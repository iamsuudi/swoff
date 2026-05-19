import { useOffline } from '../hooks/useOffline';

/**
 * OfflineIndicator component
 * 
 * Shows a banner when the user is offline.
 * Use this component to provide visual feedback about network status.
 * 
 * @example
 * <OfflineIndicator />
 * 
 * // Custom position
 * <OfflineIndicator position="top" />
 * 
 * // Custom message
 * <OfflineIndicator message="No internet connection" />
 */
export const OfflineIndicator = ({ 
  position = 'bottom-right',
  message = 'You are offline. Some features may be limited.',
  className = ''
}) => {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div 
      className={`fixed ${positionClasses[position]} bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

/**
 * OfflineBanner component
 * 
 * A larger banner that spans the width of the screen.
 * 
 * @example
 * <OfflineBanner />
 */
export const OfflineBanner = ({ 
  message = 'You are currently offline. Some features may be limited.',
  className = ''
}) => {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 z-50 flex items-center justify-center gap-2 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default OfflineIndicator;
