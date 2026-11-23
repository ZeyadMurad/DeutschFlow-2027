import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePWAUpdate() {
  const initialBuildRef = useRef<string | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Check for newly deployed service worker periodically (every 5 minutes)
      const checkUpdate = () => {
        if (navigator.onLine) {
          void registration.update().catch(() => {});
        }
      };
      const interval = window.setInterval(checkUpdate, 5 * 60 * 1000);
      const onVis = () => {
        if (document.visibilityState === 'visible') checkUpdate();
      };
      document.addEventListener('visibilitychange', onVis);
      // Clean up if page unloads
      window.addEventListener(
        'beforeunload',
        () => {
          window.clearInterval(interval);
          document.removeEventListener('visibilitychange', onVis);
        },
        { once: true }
      );
    },
  });

  // Also detect fresh server deploy buildId on focus so non-SW browsers stay informed
  useEffect(() => {
    const verifyServerVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { buildId?: string };
        if (!json.buildId) return;
        if (!initialBuildRef.current) {
          initialBuildRef.current = json.buildId;
        } else if (initialBuildRef.current !== json.buildId) {
          setNeedRefresh(true);
        }
      } catch {
        // Ignore offline checks gracefully
      }
    };

    void verifyServerVersion();
    const timer = window.setInterval(verifyServerVersion, 10 * 60 * 1000);
    const onFocus = () => {
      if (document.visibilityState === 'visible') void verifyServerVersion();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [setNeedRefresh]);

  const applyUpdate = () => {
    void updateServiceWorker(true);
  };

  const dismissUpdate = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return {
    needRefresh,
    offlineReady,
    applyUpdate,
    dismissUpdate,
  };
}
