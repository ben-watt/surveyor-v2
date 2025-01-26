import { useEffect, useCallback } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SYNC_TAG = 'data-sync';

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager;
}

export function useDataSync() {
  const { authStatus } = useAuthenticator();
  
  const registerSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(SYNC_TAG);
      } catch (error) {
        console.error('Failed to register sync:', error);
      }
    }
  }, []);

  // Setup window focus listener
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const onFocus = () => {
      console.debug('[useDataSync] Window focused, triggering sync');
      registerSync();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [authStatus, registerSync]);

  // Setup online/offline listener
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const onOnline = () => {
      console.debug('[useDataSync] Network online, triggering sync');
      registerSync();
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [authStatus, registerSync]);

  // Setup periodic sync
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const setupPeriodicSync = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready as ExtendedServiceWorkerRegistration;
          
          if (registration.periodicSync) {
            const tags = await registration.periodicSync.getTags();
            
            if (!tags.includes(SYNC_TAG)) {
              await registration.periodicSync.register(SYNC_TAG, {
                minInterval: SYNC_INTERVAL
              });
            }
          } else {
            // Fallback to setInterval if periodic sync is not available
            const intervalId = setInterval(registerSync, SYNC_INTERVAL);
            return () => clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Failed to setup periodic sync:', error);
          // Fallback to setInterval
          const intervalId = setInterval(registerSync, SYNC_INTERVAL);
          return () => clearInterval(intervalId);
        }
      }
    };

    setupPeriodicSync();
  }, [authStatus, registerSync]);
}

// Export a helper function to trigger sync after local changes
export function triggerSync() {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register(SYNC_TAG).catch(error => {
        console.error('Failed to register sync after local change:', error);
      });
    });
  }
} 